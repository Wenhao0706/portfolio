import { describe, it, expect, beforeEach, vi } from 'vitest'

const validatorMock = vi.hoisted(() => vi.fn())

vi.mock('node-email-verifier', () => ({
  default: validatorMock,
}))

import { verifyEmailDeliverability } from '../email-verify'

describe('verifyEmailDeliverability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes an address whose domain has MX records and is not disposable', async () => {
    validatorMock.mockResolvedValue({
      valid: true,
      format: { valid: true },
      mx: { valid: true },
      disposable: { valid: true },
    })
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: false,
    })
  })

  it('blocks an address whose domain has no MX records', async () => {
    validatorMock.mockResolvedValue({
      valid: false,
      format: { valid: true },
      mx: { valid: false, errorCode: 'NO_MX_RECORDS' },
      disposable: { valid: true },
    })
    const result = await verifyEmailDeliverability('jane@gmial.com')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('mx')
    expect(result.degraded).toBe(false)
  })

  it('still hard-blocks NO_MX_RECORDS rather than folding it into degraded (over-correction guard)', async () => {
    validatorMock.mockResolvedValue({
      valid: false,
      format: { valid: true },
      mx: { valid: false, errorCode: 'NO_MX_RECORDS' },
      disposable: { valid: true },
    })
    await expect(verifyEmailDeliverability('jane@gmial.com')).resolves.toEqual({
      ok: false,
      reason: 'mx',
      degraded: false,
    })
  })

  it('fails open when the resolver itself is down (DNS_LOOKUP_FAILED)', async () => {
    validatorMock.mockResolvedValue({
      valid: false,
      format: { valid: true },
      mx: { valid: false, errorCode: 'DNS_LOOKUP_FAILED' },
      disposable: { valid: true },
    })
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: true,
      degradedReason: 'dns',
    })
  })

  it('fails open when the MX lookup itself errors (MX_LOOKUP_FAILED)', async () => {
    validatorMock.mockResolvedValue({
      valid: false,
      format: { valid: true },
      mx: { valid: false, errorCode: 'MX_LOOKUP_FAILED' },
      disposable: { valid: true },
    })
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: true,
      degradedReason: 'dns',
    })
  })

  it('blocks a malformed address with reason "format"', async () => {
    validatorMock.mockResolvedValue({ valid: false, email: 'nope', format: { valid: false } })
    await expect(verifyEmailDeliverability('nope')).resolves.toEqual({
      ok: false,
      reason: 'format',
      degraded: false,
    })
  })

  // The mx shape here is the library's REAL output for a disposable hit: dist/index.js skips
  // the MX check entirely and stamps mx.valid: false / MX_SKIPPED_DISPOSABLE. Using the
  // fictional `mx: { valid: true }` made this test pass regardless of branch order, so
  // swapping the disposable and mx checks would ship `reason: 'mx'` for disposables unnoticed.
  it('blocks a disposable address, checking disposable before mx', async () => {
    validatorMock.mockResolvedValue({
      valid: false,
      format: { valid: true },
      mx: { valid: false, records: [], errorCode: 'MX_SKIPPED_DISPOSABLE' },
      disposable: { valid: false },
    })
    const result = await verifyEmailDeliverability('jane@mailinator.com')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('disposable')
    expect(result.degraded).toBe(false)
  })

  it('fails open AND flags degraded when the library throws on DNS timeout', async () => {
    validatorMock.mockRejectedValue(new Error('DNS lookup timed out'))
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: true,
      degradedReason: 'timeout',
    })
  })

  // Guards the `as ValidationResult` cast: without `detailed: true` the library returns a plain
  // boolean, and reading `.valid` off it would block every address as reason 'format'.
  it('fails open when the library returns a bare boolean instead of a detailed result', async () => {
    validatorMock.mockResolvedValue(true)
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: true,
      degradedReason: 'not-detailed',
    })
  })

  it('calls the library with MX, disposable, detailed and a 3000ms timeout', async () => {
    validatorMock.mockResolvedValue({
      valid: true,
      format: { valid: true },
      mx: { valid: true },
      disposable: { valid: true },
    })
    await verifyEmailDeliverability('jane@gmail.com')
    expect(validatorMock).toHaveBeenCalledWith('jane@gmail.com', {
      checkMx: true,
      checkDisposable: true,
      detailed: true,
      timeout: 3000,
    })
  })
})
