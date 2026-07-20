export type ContactInput = {
  name: string
  email: string
  message: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContactInput(input: ContactInput): string | null {
  if (!input.name.trim()) {
    return 'Please enter your name.'
  }
  if (!input.email.trim() || !EMAIL_REGEX.test(input.email.trim())) {
    return 'Please enter a valid email address.'
  }
  if (!input.message.trim()) {
    return 'Please enter a message.'
  }
  return null
}
