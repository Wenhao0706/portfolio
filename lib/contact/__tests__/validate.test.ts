import { describe, it, expect } from 'vitest'
import {
  validateContactInput,
  sanitizeName,
  NAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
} from '../validate'

describe('validateContactInput', () => {
  it('returns null for valid input', () => {
    expect(
      validateContactInput({ name: 'Jane', email: 'jane@example.com', message: 'Hi there' })
    ).toBeNull()
  })

  it('rejects an empty name', () => {
    expect(
      validateContactInput({ name: '  ', email: 'jane@example.com', message: 'Hi there' })
    ).toBe('Please enter your name.')
  })

  it('rejects a missing @ in the email', () => {
    expect(
      validateContactInput({ name: 'Jane', email: 'jane.example.com', message: 'Hi there' })
    ).toBe('Please enter a valid email address.')
  })

  it('rejects an empty email', () => {
    expect(
      validateContactInput({ name: 'Jane', email: '  ', message: 'Hi there' })
    ).toBe('Please enter a valid email address.')
  })

  it('rejects an empty message', () => {
    expect(
      validateContactInput({ name: 'Jane', email: 'jane@example.com', message: '   ' })
    ).toBe('Please enter a message.')
  })

  // Unbounded fields go straight into a Gmail send, so the cap is a quota guard as much as
  // a data-quality one. Boundary cases, not just "very long", so an off-by-one is visible.
  describe('length limits', () => {
    it('accepts a name exactly at the limit', () => {
      expect(
        validateContactInput({
          name: 'a'.repeat(NAME_MAX_LENGTH),
          email: 'jane@example.com',
          message: 'Hi',
        })
      ).toBeNull()
    })

    it('rejects a name one character over the limit', () => {
      expect(
        validateContactInput({
          name: 'a'.repeat(NAME_MAX_LENGTH + 1),
          email: 'jane@example.com',
          message: 'Hi',
        })
      ).toMatch(/shorten your name/i)
    })

    it('rejects a message one character over the limit', () => {
      expect(
        validateContactInput({
          name: 'Jane',
          email: 'jane@example.com',
          message: 'a'.repeat(MESSAGE_MAX_LENGTH + 1),
        })
      ).toMatch(/shorten your message/i)
    })

    it('rejects an email past the RFC length limit', () => {
      const local = 'a'.repeat(EMAIL_MAX_LENGTH)
      expect(
        validateContactInput({ name: 'Jane', email: `${local}@example.com`, message: 'Hi' })
      ).toMatch(/too long/i)
    })
  })
})

// The name is the only field that reaches a mail HEADER (the subject line). nodemailer
// strips CR/LF itself, but this is the layer that owns the guarantee.
describe('sanitizeName', () => {
  it('strips newlines that would otherwise reach the subject header', () => {
    expect(sanitizeName('Jane\r\nBcc: attacker@evil.com')).toBe('Jane Bcc: attacker@evil.com')
  })

  it('strips control characters', () => {
    expect(sanitizeName('Ja\u0000ne\u007F')).toBe('Ja ne')
  })

  it('collapses runs of whitespace and trims the ends', () => {
    expect(sanitizeName('  Jane   Doe  ')).toBe('Jane Doe')
  })

  it('leaves an ordinary name untouched', () => {
    expect(sanitizeName('Yoon Man Hou')).toBe('Yoon Man Hou')
  })

  // Markup is inert in a text/plain part, so escaping it would only make a real name with
  // an ampersand render as &amp; in the email. The payload must survive as literal text.
  it('does not html-escape, because the email is plain text', () => {
    expect(sanitizeName('<script>alert(1)</script>')).toBe('<script>alert(1)</script>')
    expect(sanitizeName('Ben & Jerry')).toBe('Ben & Jerry')
  })
})
