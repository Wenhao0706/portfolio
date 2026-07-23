import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { verifyRecaptcha, RECAPTCHA_SCORE_THRESHOLD } from '../recaptcha'

describe('verifyRecaptcha', () => {
  beforeEach(() => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.RECAPTCHA_SECRET_KEY
  })

  it('returns true when Google reports success and a high score', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, score: 0.9 }),
    } as Response)

    await expect(verifyRecaptcha('good-token')).resolves.toBe(true)
  })

  it('returns false when Google reports success false', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: false }),
    } as Response)

    await expect(verifyRecaptcha('bad-token')).resolves.toBe(false)
  })

  it('returns false when the score is below the threshold', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, score: RECAPTCHA_SCORE_THRESHOLD - 0.1 }),
    } as Response)

    await expect(verifyRecaptcha('low-score-token')).resolves.toBe(false)
  })

  it('throws when RECAPTCHA_SECRET_KEY is not set', async () => {
    delete process.env.RECAPTCHA_SECRET_KEY
    await expect(verifyRecaptcha('any-token')).rejects.toThrow()
  })
})
