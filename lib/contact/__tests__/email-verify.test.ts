import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { validatorMock, resolveMxMock } = vi.hoisted(() => ({
  validatorMock: vi.fn(),
  resolveMxMock: vi.fn(),
}))

vi.mock('node-email-verifier', () => ({
  default: validatorMock,
}))

// MX resolution moved OUT of the library and into this module — see the docblock in
// email-verify.ts. These tests therefore drive the real resolver's error codes, which is
// where the truth lives; the library's own codes cannot express "no mail server".
// `default` as well as the named export: node:dns is CJS, so the ESM interop layer reads
// the default binding even though the source only imports `{ promises }`.
vi.mock('node:dns', () => {
  const promises = { resolveMx: resolveMxMock }
  return { promises, default: { promises } }
})

import { verifyEmailDeliverability } from '../email-verify'

/** The library's shape for an address that passes format and is not disposable. */
const CLEAN = {
  valid: true,
  format: { valid: true },
  disposable: { valid: true },
}

function dnsError(code: string) {
  return Object.assign(new Error(code), { code })
}

describe('verifyEmailDeliverability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    validatorMock.mockResolvedValue(CLEAN)
  })

  it('passes an address whose domain has MX records and is not disposable', async () => {
    resolveMxMock.mockResolvedValue([{ exchange: 'mx.gmail.com', priority: 10 }])
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: false,
    })
  })

  // THE regression guard for this whole rewrite. dns.resolveMx THROWS ENODATA for a domain
  // that exists with no mail server (test.com). node-email-verifier folded that into
  // DNS_LOOKUP_FAILED — "our resolver is broken" — so the gate failed open and blocked
  // nothing, ever. A verdict about the DOMAIN must block.
  it('blocks a domain that exists but has no mail server (ENODATA)', async () => {
    resolveMxMock.mockRejectedValue(dnsError('ENODATA'))
    await expect(verifyEmailDeliverability('someone@test.com')).resolves.toEqual({
      ok: false,
      reason: 'mx',
      degraded: false,
    })
  })

  it('blocks a domain that does not exist at all (ENOTFOUND)', async () => {
    resolveMxMock.mockRejectedValue(dnsError('ENOTFOUND'))
    await expect(verifyEmailDeliverability('jane@definitely-not-a-domain.invalid')).resolves.toEqual({
      ok: false,
      reason: 'mx',
      degraded: false,
    })
  })

  it('blocks a domain that resolves to an empty MX list', async () => {
    resolveMxMock.mockResolvedValue([])
    await expect(verifyEmailDeliverability('jane@no-mx.com')).resolves.toEqual({
      ok: false,
      reason: 'mx',
      degraded: false,
    })
  })

  describe('ESERVFAIL — ambiguous, so it gets one retry', () => {
    it('passes when the retry succeeds', async () => {
      resolveMxMock
        .mockRejectedValueOnce(dnsError('ESERVFAIL'))
        .mockResolvedValueOnce([{ exchange: 'mx.example.com', priority: 10 }])

      await expect(verifyEmailDeliverability('jane@flaky.com')).resolves.toEqual({
        ok: true,
        degraded: false,
      })
      expect(resolveMxMock).toHaveBeenCalledTimes(2)
    })

    it('blocks when the retry fails the same way', async () => {
      resolveMxMock.mockRejectedValue(dnsError('ESERVFAIL'))

      await expect(verifyEmailDeliverability('jane@gmial.com')).resolves.toEqual({
        ok: false,
        reason: 'mx',
        degraded: false,
      })
      expect(resolveMxMock).toHaveBeenCalledTimes(2)
    })

    it('fails open when the retry fails for a DIFFERENT, resolver-side reason', async () => {
      resolveMxMock
        .mockRejectedValueOnce(dnsError('ESERVFAIL'))
        .mockRejectedValueOnce(dnsError('ECONNREFUSED'))

      await expect(verifyEmailDeliverability('jane@example.com')).resolves.toEqual({
        ok: true,
        degraded: true,
        degradedReason: 'dns',
      })
    })

    // The retry must be classified by the SAME domain-vs-resolver rule as the first attempt.
    // Routing it straight to the resolver-failure path waved through an address that a
    // first-attempt ENOTFOUND would have blocked — a flaky nameserver during propagation
    // produces exactly this sequence.
    it.each(['ENODATA', 'ENOTFOUND', 'NXDOMAIN'])(
      'still BLOCKS when the retry returns a domain verdict (%s)',
      async (code) => {
        resolveMxMock
          .mockRejectedValueOnce(dnsError('ESERVFAIL'))
          .mockRejectedValueOnce(dnsError(code))

        await expect(verifyEmailDeliverability('jane@broken.com')).resolves.toEqual({
          ok: false,
          reason: 'mx',
          degraded: false,
        })
      }
    )
  })

  // Everything below is a statement about OUR resolver, never about the visitor's domain,
  // so it must never cost a real person their message.
  it.each(['ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'EREFUSED'])(
    'fails open when the resolver itself fails (%s)',
    async (code) => {
      resolveMxMock.mockRejectedValue(dnsError(code))
      await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
        ok: true,
        degraded: true,
        degradedReason: 'dns',
      })
    }
  )

  it('blocks a disposable address without ever reaching the MX lookup', async () => {
    validatorMock.mockResolvedValue({
      valid: false,
      format: { valid: true },
      disposable: { valid: false },
    })

    await expect(verifyEmailDeliverability('jane@mailinator.com')).resolves.toEqual({
      ok: false,
      reason: 'disposable',
      degraded: false,
    })
    // Ordering is load-bearing: a disposable address reported as `mx` gets the wrong,
    // harsher user-facing message.
    expect(resolveMxMock).not.toHaveBeenCalled()
  })

  it('blocks a malformed address with reason "format"', async () => {
    validatorMock.mockResolvedValue({ valid: false, format: { valid: false } })
    await expect(verifyEmailDeliverability('nope@nope')).resolves.toEqual({
      ok: false,
      reason: 'format',
      degraded: false,
    })
  })

  it('blocks an address with no domain part at all', async () => {
    await expect(verifyEmailDeliverability('nope')).resolves.toEqual({
      ok: false,
      reason: 'format',
      degraded: false,
    })
    expect(validatorMock).not.toHaveBeenCalled()
  })

  it('fails open AND flags degraded when the library throws', async () => {
    validatorMock.mockRejectedValue(new Error('library exploded'))
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: true,
      degradedReason: 'timeout',
    })
  })

  // Guards the `as ValidationResult` cast: without `detailed: true` the library returns a
  // plain boolean, and reading `.valid` off it would block every address as 'format'.
  it('fails open when the library returns a bare boolean instead of a detailed result', async () => {
    validatorMock.mockResolvedValue(true)
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: true,
      degradedReason: 'not-detailed',
    })
  })

  // checkMx MUST stay false — re-enabling it would resurrect the swallowed-ENODATA bug
  // and double every submission's DNS work.
  it('asks the library for format and disposable only, never for MX', async () => {
    resolveMxMock.mockResolvedValue([{ exchange: 'mx.gmail.com', priority: 10 }])
    await verifyEmailDeliverability('jane@gmail.com')
    expect(validatorMock).toHaveBeenCalledWith('jane@gmail.com', {
      checkMx: false,
      checkDisposable: true,
      detailed: true,
      timeout: 3000,
    })
  })
})

describe('verifyEmailDeliverability — lookup timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    validatorMock.mockResolvedValue(CLEAN)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fails open with reason "timeout" when the MX lookup hangs past the budget', async () => {
    resolveMxMock.mockReturnValue(new Promise(() => {}))

    const pending = verifyEmailDeliverability('jane@slow.com')
    await vi.advanceTimersByTimeAsync(3001)

    await expect(pending).resolves.toEqual({
      ok: true,
      degraded: true,
      degradedReason: 'timeout',
    })
  })

  // The retry shares the FIRST attempt's budget rather than starting a fresh 3s. Without
  // this the gate's worst case doubles, inside one serverless invocation that still has
  // reCAPTCHA and an SMTP round trip to pay for.
  it('does not spend a second full budget on the ESERVFAIL retry', async () => {
    resolveMxMock
      .mockRejectedValueOnce(Object.assign(new Error('ESERVFAIL'), { code: 'ESERVFAIL' }))
      .mockReturnValueOnce(new Promise(() => {}))

    const pending = verifyEmailDeliverability('jane@slow.com')
    await vi.advanceTimersByTimeAsync(3001)

    await expect(pending).resolves.toEqual({
      ok: true,
      degraded: true,
      degradedReason: 'timeout',
    })
  })
})
