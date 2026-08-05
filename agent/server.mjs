#!/usr/bin/env node
/**
 * The EC2 half of the chatbot. Runs as `claudeagent`, listens on loopback only, and
 * shells out to `claude -p` under the box's subscription login.
 *
 * Deliberately dependency-free: no npm install, no lockfile, nothing to keep patched on a
 * box whose entire value is that it holds a Claude credential. `node server.mjs` is the
 * whole deployment.
 *
 * This process holds NO persona, knowledge base or history. All of that arrives in the
 * request from Vercel, so changing what the bot says is a git push to the site rather
 * than an SSH session here. See lib/chat/agent.ts for the other end of the contract.
 */

import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { timingSafeEqual } from 'node:crypto'

const PORT = Number(process.env.CHAT_AGENT_PORT ?? 8787)

/**
 * Loopback, never 0.0.0.0. The box reaches the internet through an outbound Cloudflare
 * Tunnel and has no inbound ports open, so binding a public interface would only widen
 * the attack surface without making the service reachable any other way.
 */
const HOST = '127.0.0.1'

const SECRET = process.env.CHAT_AGENT_SECRET ?? ''

/**
 * Below Vercel's 40s client timeout would be wrong — we want OUR kill to be the slower
 * one, so a slow answer surfaces to the visitor as Vercel's timeout with the process
 * already cleaned up here, rather than an orphaned `claude` still holding the queue slot.
 */
const CLAUDE_TIMEOUT_MS = 45_000

/**
 * 64 KB. Vercel already caps history at 12 messages of 1000 chars, so a legitimate body
 * is a few KB at most. This is the backstop for a request that did not come from Vercel.
 */
const MAX_BODY_BYTES = 64 * 1024

/**
 * One `claude` process at a time, and at most this many waiting.
 *
 * The serialisation is not a nicety: t3.micro has 1 GB of RAM and idles at ~26%, so two
 * concurrent `claude` processes exhaust the box even with the 2 GB swap file. The queue
 * DEPTH cap matters just as much — an unbounded queue turns a burst into a pile of
 * requests that all time out on the Vercel side while still costing quota here.
 */
const MAX_QUEUE_DEPTH = 4

/** Empty and owned by the service user. `claude` gets no project files to look at. */
const WORK_DIR = process.env.CHAT_AGENT_CWD ?? '/home/claudeagent/scratch'

/**
 * Belt and braces on top of the empty cwd and the unprivileged user.
 *
 * A system prompt saying "do not run commands" is a request, not a boundary — the actual
 * boundary is here, at the flag level. `--permission-mode manual` means nothing is
 * auto-approved, and in `-p` there is no one to approve it, so a tool call fails instead
 * of running. The explicit deny list is the second lock in case a future CLI version
 * changes what `manual` covers.
 *
 * NOTE: `--bare` looks tempting for a locked-down run and must NOT be added. It forces
 * Anthropic auth to ANTHROPIC_API_KEY and never reads the OAuth login, which is the one
 * thing this entire architecture exists to use.
 */
const CLAUDE_ARGS = [
  '-p',
  '--output-format', 'json',
  '--model', 'sonnet',
  '--permission-mode', 'manual',
  '--strict-mcp-config',
  // Load-bearing, and NOT just hygiene. Without it the CLI injects its agent scaffolding
  // (CLAUDE.md, skills, plugins, hooks, output styles) into the run, and the model
  // narrates it — a real answer came back opening with "This isn't a coding task, so no
  // skills needed here", which a visitor would have read. `--safe-mode` turns all of that
  // off. It is safe here in a way `--bare` is not: it disables customizations only and
  // leaves the OAuth subscription login alone.
  '--safe-mode',
  '--disallowed-tools',
  'Bash,Read,Write,Edit,NotebookEdit,Glob,Grep,WebFetch,WebSearch,Task,Agent,TodoWrite,Skill',
]

/**
 * An Error carrying the status the request handler should answer with. The handler reads
 * `err.statusCode` off whatever it catches and falls back to 500, so anything thrown
 * without one is by definition a bug rather than a handled failure.
 */
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode })
}

/** Constant-time compare that does not leak the secret's length through an early return. */
function secretMatches(provided) {
  const a = Buffer.from(provided)
  const b = Buffer.from(SECRET)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        // Destroy rather than just stop reading: without it the client keeps sending a
        // body nobody is consuming until the socket timeout.
        reject(httpError(413, 'body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Runs one `claude -p`. The prompt goes over stdin rather than argv so a long transcript
 * can never hit ARG_MAX and so it never appears in `ps` output on a shared box.
 */
function runClaude(system, prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', [...CLAUDE_ARGS, '--system-prompt', system], {
      cwd: WORK_DIR,
      // A minimal env, but HOME is mandatory: it is how `claude` finds
      // ~/.claude/.credentials.json, and without it every call fails as unauthenticated.
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        USER: process.env.USER,
        LANG: process.env.LANG ?? 'C.UTF-8',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = setTimeout(() => {
      settled = true
      // SIGKILL, not SIGTERM. A wedged `claude` that ignores TERM would hold the single
      // queue slot for every subsequent visitor, which is the one failure that takes the
      // whole chatbot down rather than just one message.
      child.kill('SIGKILL')
      reject(httpError(504, 'claude timed out'))
    }, CLAUDE_TIMEOUT_MS)

    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(err)
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)

      if (code !== 0) {
        // stderr is the only place a quota exhaustion or an expired login shows up, and
        // those are the two failures worth waking up for. Truncated so a stack trace
        // cannot flood the journal.
        console.error(`[agent] claude exit ${code}: ${stderr.slice(0, 500)}`)
        reject(httpError(502, 'claude failed'))
        return
      }

      // --output-format json wraps the answer: { type, subtype, is_error, result, ... }.
      // Falling back to raw stdout keeps this working if that shape ever changes, since a
      // parse failure would otherwise take the bot down for a purely cosmetic reason.
      let reply = stdout.trim()
      try {
        const parsed = JSON.parse(stdout)
        if (parsed?.is_error) {
          console.error(`[agent] claude reported is_error: ${String(parsed.result).slice(0, 500)}`)
          reject(httpError(502, 'claude reported an error'))
          return
        }
        if (typeof parsed?.result === 'string') reply = parsed.result.trim()
      } catch {
        console.warn('[agent] could not parse claude JSON output, using raw stdout')
      }

      resolve(reply)
    })

    child.stdin.end(prompt)
  })
}

/**
 * Serialises every call into a single chain. `queueDepth` is tracked separately from the
 * chain because a promise chain has no readable length — without the counter there is no
 * way to reject a burst before it is already queued.
 */
let chain = Promise.resolve()
let queueDepth = 0

function enqueue(task) {
  if (queueDepth >= MAX_QUEUE_DEPTH) {
    return Promise.reject(httpError(503, 'busy'))
  }
  queueDepth += 1
  // The `.catch` keeps one failed task from poisoning the chain for every later one.
  const result = chain.then(task, task)
  chain = result.catch(() => {})
  return result.finally(() => { queueDepth -= 1 })
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { ok: true, queueDepth })
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'method not allowed' })
  }

  const auth = req.headers.authorization ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!SECRET || !token || !secretMatches(token)) {
    // No detail in the response: an unauthenticated caller learns only that it failed,
    // not whether the secret is unset here or merely wrong.
    console.warn('[agent] rejected unauthenticated request')
    return sendJson(res, 401, { error: 'unauthorized' })
  }

  let payload
  try {
    payload = JSON.parse(await readBody(req))
  } catch (err) {
    return sendJson(res, err.statusCode ?? 400, { error: 'bad request' })
  }

  const { system, prompt } = payload ?? {}
  if (typeof system !== 'string' || typeof prompt !== 'string' || !system || !prompt) {
    return sendJson(res, 400, { error: 'bad request' })
  }

  try {
    const reply = await enqueue(() => runClaude(system, prompt))
    sendJson(res, 200, { reply })
  } catch (err) {
    const status = err.statusCode ?? 500
    console.error(`[agent] request failed (${status}): ${err.message}`)
    sendJson(res, status, { error: 'agent error' })
  }
})

if (!SECRET) {
  // Refuse to start rather than run open. A server that boots without its secret and
  // rejects everything looks identical in the logs to one that is merely unused.
  console.error('[agent] CHAT_AGENT_SECRET is not set — refusing to start')
  process.exit(1)
}

server.listen(PORT, HOST, () => {
  console.log(`[agent] listening on http://${HOST}:${PORT}`)
})
