import { describe, expect, it } from 'vitest'
import { PROJECTS } from '@/lib/projects'

describe('PROJECTS', () => {
  it('orders cards by strength, not by linkability', () => {
    expect(PROJECTS.map((p) => p.slug)).toEqual([
      'geofencing-app',
      'tech-strongbox-project',
      'ai-assisted-project',
    ])
  })

  it('gives every project a real description with no bracketed placeholder', () => {
    for (const project of PROJECTS) {
      expect(project.description.length).toBeGreaterThan(80)
      expect(project.description).not.toMatch(/[[\]]/)
    }
  })

  /* Naming a client is a claim that he built their site. This pins the list to the five
     he built as sole developer, so the brands he only maintained cannot drift in. */
  it('links only the five sites he built from scratch as sole developer', () => {
    const sited = PROJECTS.filter((p) => p.sites)
    expect(sited.map((p) => p.slug)).toEqual(['tech-strongbox-project'])
    expect(sited[0].sites).toHaveLength(5)
  })

  it('gives every site an https url and a label', () => {
    for (const site of PROJECTS.flatMap((p) => p.sites ?? [])) {
      expect(site.href).toMatch(/^https:\/\//)
      expect(site.label.length).toBeGreaterThan(0)
    }
  })

  it('only exposes a repo link where one actually exists', () => {
    const linked = PROJECTS.filter((p) => p.repoUrl)
    expect(linked.map((p) => p.slug)).toEqual(['ai-assisted-project'])
  })
})

describe('project data model', () => {
  it('carries no detail-page fields now the detail route is gone', () => {
    const dead = ['introduction', 'purposeAndGoal', 'spotlight', 'currentStatus', 'lessonsLearned']
    for (const project of PROJECTS) {
      for (const field of dead) {
        expect(project).not.toHaveProperty(field)
      }
    }
  })
})
