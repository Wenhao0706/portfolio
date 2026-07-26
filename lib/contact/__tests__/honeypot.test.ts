import { describe, it, expect } from 'vitest'
import { HONEYPOT_FIELD, isBot } from '../honeypot'

function formDataWith(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('isBot', () => {
  it('returns true when the honeypot field has a value', () => {
    expect(isBot(formDataWith({ [HONEYPOT_FIELD]: 'Acme Corp' }))).toBe(true)
  })

  it('returns false when the honeypot field is empty', () => {
    expect(isBot(formDataWith({ [HONEYPOT_FIELD]: '' }))).toBe(false)
  })

  it('returns false when the honeypot field is absent entirely', () => {
    expect(isBot(formDataWith({ name: 'Jane' }))).toBe(false)
  })

  it('returns false when the honeypot field holds only whitespace', () => {
    expect(isBot(formDataWith({ [HONEYPOT_FIELD]: '   ' }))).toBe(false)
  })
})
