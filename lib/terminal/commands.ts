/**
 * The terminal's command registry.
 *
 * PURE. `runCommand` takes a string and returns lines plus an optional effect; it
 * touches no DOM, no router and no theme. Everything with a side effect (clearing
 * the screen, scrolling the page, toggling the theme, opening a link) is returned
 * as a described `TerminalEffect` for the component to carry out.
 *
 * That split is what makes the whole surface testable: the interesting part of an
 * interactive terminal is the parsing and the output, and none of it needs a
 * browser to assert.
 *
 * Every fact printed here is read from the same modules the page renders from, so
 * a visitor cannot be told one thing by the terminal and another by the section
 * three scrolls down.
 */
import { ABOUT_PARAGRAPHS, ROLE_LINE } from '@/lib/about'
import { type Project, PROJECTS } from '@/lib/projects'
import { EMAIL, GITHUB_URL, LINKEDIN_URL, WHATSAPP_URL } from '@/lib/site'
import { TECH_GROUPS } from '@/lib/tech'

export const PROMPT = 'guest@portfolio'

export type LineTone = 'default' | 'muted' | 'accent' | 'error'

export type OutputLine = { text: string; tone?: LineTone }

export type TerminalEffect =
  | { kind: 'clear' }
  | { kind: 'theme' }
  | { kind: 'scroll'; target: string }
  | { kind: 'open'; href: string }
  | { kind: 'download'; href: string }

export type CommandResult = { lines: OutputLine[]; effect?: TerminalEffect }

type Command = {
  name: string
  /** Shown by `help`. Kept to one short line so the help output stays scannable. */
  summary: string
  run: (args: string[]) => CommandResult
}

const line = (text: string, tone?: LineTone): OutputLine => ({ text, tone })
const blank = (): OutputLine => ({ text: '' })

/**
 * Joins groups of lines with one blank line between them and none at the end.
 *
 * Every multi-part listing here (`about`, `skills`, `projects`) wants the same
 * spacing, and hand-rolling it per builder is how one of them ends up with a
 * stray trailing gap that only shows once the transcript scrolls.
 */
const joinBlocks = (blocks: OutputLine[][]): OutputLine[] =>
  blocks.flatMap((block, i) => (i === 0 ? block : [blank(), ...block]))

const findProject = (slug: string) => PROJECTS.find((project) => project.slug === slug)

/**
 * Widest site label across every project, so the URL column lines up in a monospace
 * transcript. Derived rather than hardcoded — a longer client name added to
 * `lib/projects.ts` would otherwise push one row out of alignment and nothing would
 * fail to warn about it.
 */
const SITE_LABEL_WIDTH = Math.max(
  0,
  ...PROJECTS.flatMap((project) => project.sites ?? []).map((site) => site.label.length)
)

/**
 * Where `open <slug>` goes: a repo wins, otherwise the first live site. `others` is
 * how many destinations that choice leaves behind, so the command can own up to them
 * in one place rather than re-deriving the same precedence at the call site.
 * Undefined when the project has nowhere public to go at all — exported because the
 * tests need the same rule to pick their fixtures, and a second copy of it would
 * quietly stop matching.
 */
export const openTarget = (
  project: Project
): { href: string; others: number } | undefined => {
  if (project.repoUrl) return { href: project.repoUrl, others: 0 }
  const sites = project.sites ?? []
  return sites.length ? { href: sites[0].href, others: sites.length - 1 } : undefined
}

const RESUME_HREF = '/resume.pdf'

/** Section anchors `goto` accepts. Matches the real ids on the page. */
export const GOTO_TARGETS = [
  'top',
  'terminal',
  'about',
  'tech',
  'projects',
  'contact',
] as const

const FILES = ['about.md', 'skills.txt', 'contact.md', 'resume.pdf'] as const

function aboutLines(): OutputLine[] {
  return joinBlocks(ABOUT_PARAGRAPHS.map((paragraph) => [line(paragraph)]))
}

function skillLines(): OutputLine[] {
  return joinBlocks(
    TECH_GROUPS.map((group) => [
      line(group.title, 'accent'),
      line(`  ${group.items.map((item) => item.label).join('  ')}`),
    ])
  )
}

function contactLines(): OutputLine[] {
  return [
    line(`email     ${EMAIL}`),
    line(`github    ${GITHUB_URL}`),
    line(`linkedin  ${LINKEDIN_URL}`),
    line(`whatsapp  ${WHATSAPP_URL}`),
    blank(),
    line("Or run 'goto contact' for the form.", 'muted'),
  ]
}

function projectLines(): OutputLine[] {
  return joinBlocks(
    PROJECTS.map((project) => [
      line(project.slug, 'accent'),
      line(`  ${project.title}`),
      line(`  ${project.stack.join(', ')}`, 'muted'),
    ])
  )
}

function projectDetail(slug: string): CommandResult {
  const project = findProject(slug)
  if (!project) {
    return {
      lines: [
        line(`cat: ${slug}: No such file or directory`, 'error'),
        line("Run 'projects' for the list.", 'muted'),
      ],
    }
  }

  const lines = [
    line(project.title, 'accent'),
    blank(),
    line(project.description),
    blank(),
    line(`stack   ${project.stack.join(', ')}`, 'muted'),
  ]

  /* Only projects with a real repo get a repo line. A project with nowhere public
     to go gets neither, since inventing a link here would be the same lie as a dead
     "view project" affordance on the card. */
  if (project.repoUrl) lines.push(line(`repo    ${project.repoUrl}`, 'muted'))

  /* Printed as text rather than as one `open` hint, because the transcript is not
     clickable and a visitor who wants a specific one of the five needs the URL
     itself. `open <slug>` takes the first. */
  if (project.sites) {
    lines.push(blank(), line('built from scratch, sole developer', 'muted'))
    for (const site of project.sites) {
      lines.push(line(`  ${site.label.padEnd(SITE_LABEL_WIDTH)} ${site.href}`, 'muted'))
    }
  }

  return { lines }
}

const COMMANDS: Command[] = [
  {
    name: 'help',
    summary: 'list every command',
    run: () => ({
      lines: [
        line('Available commands', 'accent'),
        ...COMMANDS.map((command) => line(`  ${command.name.padEnd(10)}${command.summary}`)),
        blank(),
        line('Tab completes, up and down walk your history.', 'muted'),
      ],
    }),
  },
  {
    name: 'whoami',
    summary: 'who is behind this site',
    run: () => ({
      lines: [line('yoon_man_hou', 'accent'), line(ROLE_LINE, 'muted')],
    }),
  },
  {
    name: 'ls',
    summary: 'list files, or `ls projects`',
    run: (args) => {
      if (args[0] === 'projects' || args[0] === 'projects/' || args[0] === './projects') {
        return { lines: PROJECTS.map((project) => line(project.slug)) }
      }
      if (args.length) {
        return { lines: [line(`ls: ${args[0]}: No such file or directory`, 'error')] }
      }
      return { lines: [line([...FILES, 'projects/'].join('   '))] }
    },
  },
  {
    name: 'cat',
    summary: 'read a file, e.g. `cat about.md`',
    run: (args) => {
      const target = args[0]
      if (!target) return { lines: [line('cat: missing file operand', 'error')] }

      /* Both `cat projects/geofencing-app` and plain `cat geofencing-app` work.
         The path form matches what `ls` prints, but nobody who is not already a
         shell user thinks to type the prefix, and refusing the bare name would be
         pedantry aimed at the exact visitor least able to recover from it. */
      if (target.startsWith('projects/')) return projectDetail(target.slice('projects/'.length))
      if (findProject(target)) return projectDetail(target)

      switch (target) {
        case 'about.md':
          return { lines: aboutLines() }
        case 'skills.txt':
          return { lines: skillLines() }
        case 'contact.md':
          return { lines: contactLines() }
        case 'resume.pdf':
          return {
            lines: [line('resume.pdf is a binary file. Downloading instead.', 'muted')],
            effect: { kind: 'download', href: RESUME_HREF },
          }
        default:
          return {
            lines: [
              line(`cat: ${target}: No such file or directory`, 'error'),
              line("Run 'ls' for the files, or 'projects' for the project names.", 'muted'),
            ],
          }
      }
    },
  },
  {
    name: 'projects',
    summary: 'list the projects',
    run: () => ({
      lines: [
        ...projectLines(),
        blank(),
        /* The bare name, not the path form. `cat projects/<name>` also works, but
           the hint should show the shortest thing that does. */
        line(`Run 'cat <name>' for the detail, e.g. cat ${PROJECTS[0].slug}`, 'muted'),
      ],
    }),
  },
  {
    name: 'skills',
    summary: 'the stack, by category',
    run: () => ({ lines: skillLines() }),
  },
  {
    name: 'contact',
    summary: 'how to reach Man Hou',
    run: () => ({ lines: contactLines() }),
  },
  {
    name: 'open',
    summary: 'open a project link in a new tab',
    run: (args) => {
      const slug = args[0]
      if (!slug) return { lines: [line('open: missing project name', 'error')] }

      const project = findProject(slug)
      if (!project) {
        return { lines: [line(`open: ${slug}: no such project`, 'error')] }
      }
      const target = openTarget(project)
      if (!target) {
        /* Every other dead end in this file points somewhere next. Stopping at
           the refusal leaves the one visitor curious enough to type a slug with
           nowhere to go. */
        return {
          lines: [
            line(`${project.slug} has nothing public to open.`, 'muted'),
            line(`Run 'cat ${project.slug}' for the detail.`, 'muted'),
          ],
        }
      }

      const lines = [line(`Opening ${target.href}`, 'muted')]
      /* One slug, several destinations. Saying so beats silently picking one and
         letting a visitor conclude the other four do not exist. */
      if (target.others > 0) {
        lines.push(line(`Run 'cat ${project.slug}' for the rest.`, 'muted'))
      }

      return { lines, effect: { kind: 'open', href: target.href } }
    },
  },
  {
    name: 'goto',
    summary: `jump to a section (${GOTO_TARGETS.join(', ')})`,
    run: (args) => {
      const target = args[0]
      if (!target) return { lines: [line('goto: missing section', 'error')] }
      if (!GOTO_TARGETS.includes(target as (typeof GOTO_TARGETS)[number])) {
        return { lines: [line(`goto: ${target}: no such section`, 'error')] }
      }
      return { lines: [line(`Jumping to #${target}`, 'muted')], effect: { kind: 'scroll', target } }
    },
  },
  {
    name: 'resume',
    summary: 'download the resume',
    run: () => ({
      lines: [line('Downloading resume.pdf', 'muted')],
      effect: { kind: 'download', href: RESUME_HREF },
    }),
  },
  {
    name: 'theme',
    summary: 'switch between light and dark',
    run: () => ({ lines: [], effect: { kind: 'theme' } }),
  },
  {
    name: 'clear',
    summary: 'clear the screen',
    run: () => ({ lines: [], effect: { kind: 'clear' } }),
  },
  {
    name: 'sudo',
    summary: 'no',
    run: () => ({
      lines: [line('guest is not in the sudoers file. This incident will be reported.', 'error')],
    }),
  },
]

export const COMMAND_NAMES = COMMANDS.map((command) => command.name)

/**
 * The commands offered as one-click buttons under the prompt.
 *
 * A blinking cursor is an invitation only if you already know shells. A recruiter
 * who does not will look at an empty prompt, feel tested, and scroll past, which
 * makes the whole section worse than nothing. These are the same commands, minus
 * the requirement to guess them.
 *
 * Kept short and non-destructive on purpose: no clear, no theme, no download.
 */
export const SUGGESTED_COMMANDS = ['help', 'whoami', 'projects', 'skills', 'contact'] as const

/**
 * Tab completion over command names, and over the argument where the command has
 * a knowable set of them. Returning the candidates rather than a single string
 * lets the caller print the options when a prefix is ambiguous, which is what a
 * real shell does.
 */
export function complete(input: string): string[] {
  const trimmed = input.trimStart()
  const parts = trimmed.split(/\s+/)

  if (parts.length <= 1) {
    return COMMAND_NAMES.filter((name) => name.startsWith(parts[0] ?? ''))
  }

  const [name, ...args] = parts
  const prefix = args[args.length - 1] ?? ''

  return argumentCandidates(name).filter((candidate) => candidate.startsWith(prefix))
}

/** The completable arguments for a command, or none for one that takes no argument. */
function argumentCandidates(name: string): readonly string[] {
  const slugs = PROJECTS.map((project) => project.slug)

  switch (name) {
    case 'cat':
      return [...FILES, ...slugs.map((slug) => `projects/${slug}`)]
    case 'open':
      return slugs
    case 'goto':
      return GOTO_TARGETS
    case 'ls':
      return ['projects']
    default:
      return []
  }
}

/**
 * Parse and run one line of input.
 *
 * An unknown command deliberately points at the chat widget rather than trying to
 * answer. The two surfaces are separate on purpose: this one is deterministic and
 * offline, and quietly forwarding to an LLM would make its behaviour depend on a
 * rate limit the visitor cannot see.
 */
export function runCommand(input: string): CommandResult {
  const trimmed = input.trim()
  if (!trimmed) return { lines: [] }

  const [name, ...args] = trimmed.split(/\s+/)
  const command = COMMANDS.find((entry) => entry.name === name.toLowerCase())

  if (!command) {
    return {
      lines: [
        line(`command not found: ${name}`, 'error'),
        line("Run 'help' for the list, or use the chat widget for open questions.", 'muted'),
      ],
    }
  }

  return command.run(args)
}
