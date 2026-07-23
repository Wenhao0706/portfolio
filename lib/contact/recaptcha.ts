export const RECAPTCHA_SCORE_THRESHOLD = 0.5

export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    throw new Error('RECAPTCHA_SECRET_KEY is not set')
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })

  const data = (await response.json()) as { success: boolean; score?: number }
  return data.success === true && (data.score ?? 0) >= RECAPTCHA_SCORE_THRESHOLD
}
