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
import { PROJECTS } from '@/lib/projects'
import { EMAIL, GITHUB_URL, WHATSAPP_URL } from '@/lib/site'
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
  return ABOUT_PARAGRAPHS.flatMap((paragraph, i) =>
    i === 0 ? [line(paragraph)] : [blank(), line(paragraph)]
  )
}

function skillLines(): OutputLine[] {
  return TECH_GROUPS.flatMap((group) => [
    line(`${group.title}`, 'accent'),
    line(`  ${group.items.map((item) => item.label).join('  ')}`),
    blank(),
  ]).slice(0, -1)
}

function contactLines(): OutputLine[] {
  return [
    line(`email     ${EMAIL}`),
    line(`github    ${GITHUB_URL}`),
    line(`whatsapp  ${WHATSAPP_URL}`),
    blank(),
    line("Or run 'goto contact' for the form.", 'muted'),
  ]
}

function projectLines(): OutputLine[] {
  return PROJECTS.flatMap((project) => [
    line(project.slug, 'accent'),
    line(`  ${project.title}`),
    line(`  ${project.stack.join(', ')}`, 'muted'),
    blank(),
  ]).slice(0, -1)
}

function projectDetail(slug: string): CommandResult {
  const project = PROJECTS.find((p) => p.slug === slug)
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

  /* Only projects with a real repo get a repo line. The other two have nowhere
     public to go, and inventing a link here would be the same lie as a dead
     "view project" affordance on the card. */
  if (project.repoUrl) lines.push(line(`repo    ${project.repoUrl}`, 'muted'))

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
      if (PROJECTS.some((project) => project.slug === target)) return projectDetail(target)

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
            effect: { kind: 'download', href: '/resume.pdf' },
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
        line("Run 'cat <name>' for the detail, e.g. cat " + PROJECTS[0].slug, 'muted'),
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
    summary: 'open a project repo in a new tab',
    run: (args) => {
      const slug = args[0]
      if (!slug) return { lines: [line('open: missing project name', 'error')] }

      const project = PROJECTS.find((p) => p.slug === slug)
      if (!project) {
        return { lines: [line(`open: ${slug}: no such project`, 'error')] }
      }
      if (!project.repoUrl) {
        return {
          lines: [line(`${project.slug} has no public repo.`, 'muted')],
        }
      }
      return {
        lines: [line(`Opening ${project.repoUrl}`, 'muted')],
        effect: { kind: 'open', href: project.repoUrl },
      }
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
      effect: { kind: 'download', href: '/resume.pdf' },
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
  const slugs = PROJECTS.map((project) => project.slug)

  const candidates =
    name === 'cat'
      ? [...FILES, ...slugs.map((slug) => `projects/${slug}`)]
      : name === 'open'
        ? slugs
        : name === 'goto'
          ? [...GOTO_TARGETS]
          : name === 'ls'
            ? ['projects']
            : []

  return candidates.filter((candidate) => candidate.startsWith(prefix))
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
