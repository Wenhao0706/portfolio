import { describe, expect, it } from 'vitest'
import {
  COMMAND_NAMES,
  complete,
  GOTO_TARGETS,
  runCommand,
  SUGGESTED_COMMANDS,
} from '@/lib/terminal/commands'
import { PROJECTS } from '@/lib/projects'
import { EMAIL } from '@/lib/site'
import { TECH_GROUPS } from '@/lib/tech'

const text = (input: string) =>
  runCommand(input)
    .lines.map((l) => l.text)
    .join('\n')

describe('runCommand', () => {
  it('does nothing on an empty line, the way a real shell does', () => {
    expect(runCommand('   ')).toEqual({ lines: [] })
  })

  it('points an unknown command at the chat widget instead of guessing', () => {
    const result = runCommand('tell me about laravel')
    expect(result.lines[0].text).toBe('command not found: tell')
    expect(result.lines[0].tone).toBe('error')
    expect(result.lines[1].text).toMatch(/chat widget/i)
  })

  it('is case insensitive on the command name', () => {
    expect(text('WHOAMI')).toBe(text('whoami'))
  })

  it('tolerates extra whitespace between arguments', () => {
    expect(text('cat    about.md')).toBe(text('cat about.md'))
  })

  it('lists every command in help, so help can never fall behind the registry', () => {
    const help = text('help')
    for (const name of COMMAND_NAMES) {
      expect(help).toContain(name)
    }
  })
})

describe('content commands read from the real site data', () => {
  it('cat about.md prints the same bio the About section renders', async () => {
    const { ABOUT_PARAGRAPHS } = await import('@/lib/about')
    const out = text('cat about.md')
    for (const paragraph of ABOUT_PARAGRAPHS) {
      expect(out).toContain(paragraph)
    }
  })

  it('skills prints every technology the tab panel shows', () => {
    const out = text('skills')
    for (const group of TECH_GROUPS) {
      for (const item of group.items) {
        expect(out).toContain(item.label)
      }
    }
  })

  it('projects lists every project slug', () => {
    const out = text('projects')
    for (const project of PROJECTS) {
      expect(out).toContain(project.slug)
    }
  })

  it('contact prints the real email', () => {
    expect(text('contact')).toContain(EMAIL)
  })
})

describe('cat', () => {
  it('reports a missing operand rather than printing nothing', () => {
    expect(runCommand('cat').lines[0].tone).toBe('error')
  })

  it('reads a project through its path', () => {
    const out = text(`cat projects/${PROJECTS[0].slug}`)
    expect(out).toContain(PROJECTS[0].title)
    expect(out).toContain(PROJECTS[0].description)
  })

  it('errors on an unknown file the way a shell does', () => {
    const result = runCommand('cat nope.txt')
    expect(result.lines[0].text).toBe('cat: nope.txt: No such file or directory')
  })
})

describe('open', () => {
  const linked = PROJECTS.find((p) => p.repoUrl)!
  const unlinked = PROJECTS.find((p) => !p.repoUrl)!

  it('returns an open effect for a project that has a repo', () => {
    expect(runCommand(`open ${linked.slug}`).effect).toEqual({
      kind: 'open',
      href: linked.repoUrl,
    })
  })

  /* The same rule the project cards follow: never offer a destination that does
     not exist. A fabricated repo link is worse than an honest "no public repo". */
  it('refuses to invent a link for a project with no repo', () => {
    const result = runCommand(`open ${unlinked.slug}`)
    expect(result.effect).toBeUndefined()
    expect(result.lines[0].text).toMatch(/no public repo/i)
  })
})

describe('effects', () => {
  it('clear asks the component to clear rather than clearing anything itself', () => {
    expect(runCommand('clear')).toEqual({ lines: [], effect: { kind: 'clear' } })
  })

  it('theme asks for a toggle', () => {
    expect(runCommand('theme').effect).toEqual({ kind: 'theme' })
  })

  it('resume asks for the download', () => {
    expect(runCommand('resume').effect).toEqual({ kind: 'download', href: '/resume.pdf' })
  })

  it('goto accepts every real section id', () => {
    for (const target of GOTO_TARGETS) {
      expect(runCommand(`goto ${target}`).effect).toEqual({ kind: 'scroll', target })
    }
  })

  it('goto rejects a section that does not exist', () => {
    const result = runCommand('goto nowhere')
    expect(result.effect).toBeUndefined()
    expect(result.lines[0].tone).toBe('error')
  })
})

describe('complete', () => {
  it('completes a command name from a prefix', () => {
    expect(complete('wh')).toEqual(['whoami'])
  })

  it('returns every command for an empty prefix', () => {
    expect(complete('')).toEqual(COMMAND_NAMES)
  })

  it('returns all candidates when a prefix is ambiguous', () => {
    const matches = complete('c')
    expect(matches).toContain('cat')
    expect(matches).toContain('clear')
    expect(matches).toContain('contact')
  })

  it('completes file names after cat', () => {
    expect(complete('cat ab')).toEqual(['about.md'])
  })

  it('completes project paths after cat', () => {
    expect(complete('cat projects/')).toEqual(
      PROJECTS.map((project) => `projects/${project.slug}`)
    )
  })

  it('completes section names after goto', () => {
    expect(complete('goto pro')).toEqual(['projects'])
  })

  it('offers nothing for a command that takes no arguments', () => {
    expect(complete('whoami ')).toEqual([])
  })
})

describe('forgiving input, for visitors who do not use shells', () => {
  const slug = PROJECTS[0].slug

  it('cat accepts a bare project name, not only the path form', () => {
    expect(text(`cat ${slug}`)).toBe(text(`cat projects/${slug}`))
  })

  it('ls accepts projects with or without a trailing slash', () => {
    expect(text('ls projects/')).toBe(text('ls projects'))
  })

  it('the projects hint shows the shortest form that works', () => {
    expect(text('projects')).toContain(`cat ${slug}`)
  })

  it('an unknown file points at both listings', () => {
    const out = text('cat wrong')
    expect(out).toMatch(/'ls'/)
    expect(out).toMatch(/'projects'/)
  })

  it('goto reaches the terminal section itself', () => {
    expect(runCommand('goto terminal').effect).toEqual({ kind: 'scroll', target: 'terminal' })
  })
})

describe('SUGGESTED_COMMANDS', () => {
  it('only offers commands that exist', () => {
    for (const command of SUGGESTED_COMMANDS) {
      expect(COMMAND_NAMES).toContain(command)
    }
  })

  /* These run from a single click, so a destructive one would fire with no
     confirmation and no way for a non-technical visitor to understand why the
     screen just emptied or the site changed colour. */
  it('offers nothing destructive or state-changing', () => {
    for (const command of SUGGESTED_COMMANDS) {
      expect(runCommand(command).effect).toBeUndefined()
    }
  })
})
