import { describe, it, expect } from 'vitest'
import { validateContactInput } from '../validate'

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
})
