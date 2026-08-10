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

  it('only exposes a repo link where one actually exists', () => {
    const linked = PROJECTS.filter((p) => p.repoUrl)
    expect(linked.map((p) => p.slug)).toEqual(['ai-assisted-project'])
  })
})
