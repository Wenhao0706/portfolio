# Chat agent — EC2 runbook

The half of the chatbot that actually calls Claude. Everything here runs on the EC2 box;
the Vercel side lives in `lib/chat/*` and `app/api/chat/route.ts`.

**Why a box at all**: `claude /login` needs a browser flow and writes a rotating token to
`~/.claude/.credentials.json`. Vercel, Lambda, Amplify and App Runner have no shell and a
read-only ephemeral filesystem, so a hand-copied token breaks the first time it refreshes.
Only a persistent machine works. See D1 in `tasks/portfolio/chatbot/current.md`.

## The box

| | |
|---|---|
| Instance | `i-09a415608db4bf1d9` — t3.micro, x86_64, Ubuntu 26.04, 16 GiB gp3 |
| Region | `ap-southeast-1` |
| SSH | `ssh -i ~/.ssh/claude-agent-key.pem ubuntu@56.10.8.219` |
| Service user | `claudeagent` (unprivileged, owns the Claude login) |
| Listens on | `127.0.0.1:8787` — loopback only, no inbound ports open |

The public IP changes on stop/start (not reboot). That breaks the SSH command only — the
service is reached through an outbound Cloudflare Tunnel that never needs a fixed address.

## Deploy

```bash
# as ubuntu
sudo install -o claudeagent -g claudeagent -m 755 -d /opt/chat-agent
sudo install -o claudeagent -g claudeagent -m 700 -d /home/claudeagent/scratch
sudo install -o claudeagent -g claudeagent -m 644 server.mjs /opt/chat-agent/server.mjs
```

`scratch` is the process's working directory and stays empty on purpose — `claude` is
given no project files to look at.

### Generate the shared secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The same value goes in the systemd unit below **and** in Vercel as `CHAT_AGENT_SECRET`.

### systemd unit

`/etc/systemd/system/chat-agent.service`:

```ini
[Unit]
Description=Portfolio chat agent
After=network-online.target

[Service]
Type=simple
User=claudeagent
WorkingDirectory=/home/claudeagent/scratch
Environment=CHAT_AGENT_SECRET=<the hex secret>
Environment=CHAT_AGENT_PORT=8787
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/chat-agent/server.mjs
Restart=always
RestartSec=5

# The credentials are the only thing on this box worth stealing. These do not replace the
# tool-level lockdown in server.mjs, they bound what a break-out could reach.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
# ...but the Claude login lives under ~, and its token ROTATES, so that one path must stay
# writable or every call fails as unauthenticated a few hours after the last manual login.
ReadWritePaths=/home/claudeagent/.claude /home/claudeagent/scratch

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now chat-agent
curl -s localhost:8787/health          # {"ok":true,"queueDepth":0}
journalctl -u chat-agent -f
```

### Cloudflare Tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create portfolio-chat
cloudflared tunnel route dns portfolio-chat chat.manhou.de
# ingress: chat.manhou.de -> http://127.0.0.1:8787
sudo cloudflared service install
```

Then set `CHAT_AGENT_URL=https://chat.manhou.de` in Vercel and **redeploy** — env vars bind
at build time, so a function deployed earlier keeps running without them and the widget
stays silently offline.

## Verifying

```bash
# Auth is enforced (expect 401)
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8787 \
  -H 'content-type: application/json' -d '{"system":"x","prompt":"y"}'

# A real round trip (expect {"reply":"..."})
curl -s -X POST localhost:8787 \
  -H "authorization: Bearer $CHAT_AGENT_SECRET" -H 'content-type: application/json' \
  -d '{"system":"You are terse.","prompt":"Say OK and nothing else.\n\nAssistant:"}'

# Nothing but SSH answers on the public IP (expect a timeout, not a response)
curl -s --max-time 5 http://56.10.8.219:8787/health
```

Re-verify the login survives a reboot any time: `sudo -u claudeagent -i` then
`claude -p "say OK"`.

## Gotchas

| Symptom | Cause | Fix |
|---|---|---|
| Every call fails as unauthenticated a few hours after login | `~/.claude/.credentials.json` rotates, and `ProtectHome=read-only` blocks the write | Keep `/home/claudeagent/.claude` in `ReadWritePaths` |
| `claude` runs fine as `ubuntu` but not under systemd | The unit's `Environment=` list replaces the shell env, and `HOME` is how `claude` finds its credentials | `server.mjs` passes `HOME` through to the child explicitly — don't strip it |
| Adding `--bare` to lock the CLI down breaks every request | `--bare` forces auth to `ANTHROPIC_API_KEY` and never reads the OAuth login | Never add it. The subscription login is the entire point of this architecture |
| Second concurrent request hangs or the box OOMs | 1 GB RAM, idling at ~26%. Two `claude` processes exhaust it even with the 2 GB swap | The single-slot queue in `server.mjs` is mandatory, not a nicety |
| The queue jams and every request times out | A wedged `claude` ignoring SIGTERM holds the only slot | Already handled — the timeout sends SIGKILL. If it recurs, check `journalctl` for the exit code |
| `fallocate: Text file busy` making the swap file | `/swapfile` already exists and is active | Success, not failure. Confirm with `free -h` |
| `apt` 503s from `ap-southeast-1.ec2.archive.ubuntu.com` | The AWS regional mirror goes down for hours and apt retries the same host forever | Repoint at `archive.ubuntu.com` in `/etc/apt/sources.list.d/ubuntu.sources` (26.04 uses deb822) |

## Cost

Flat, not per message: ~$9.60 t3.micro + ~$1.54 gp3 ≈ **$11/month** at 0 or 10,000
messages. The Claude calls are $0 — they run on the subscription. The real per-message
cost is **quota**, drawn from the same weekly allowance used for development, which is
what the rate limit in `lib/chat/ratelimit.ts` is protecting.
