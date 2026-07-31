export type ContactInput = {
  name: string
  email: string
  message: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Generous enough that no real person hits it, small enough that nobody mails a novel. */
export const NAME_MAX_LENGTH = 100
export const MESSAGE_MAX_LENGTH = 5000
/** RFC 5321's hard limit on a forward path. Anything longer is not a deliverable address. */
export const EMAIL_MAX_LENGTH = 254

/**
 * The name reaches the SUBJECT header, so newlines and control characters are stripped
 * rather than merely rejected — nodemailer already refuses to write a CR/LF into a header
 * (mime-node's `_encodeHeaderValue`), but relying on a dependency's internals to be the
 * only thing standing between user input and a header is a thin place to be standing.
 *
 * Deliberately NOT html-escaping: `sendContactEmail` sends a `text:` part only, where
 * markup is inert. Escaping would turn a name containing `&` into a visible `&amp;`.
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function validateContactInput(input: ContactInput): string | null {
  // Every check below judges the trimmed value, so trim once — the caller still submits the
  // raw fields, since only validation cares about the surrounding whitespace.
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()

  if (!name) {
    return 'Please enter your name.'
  }
  if (name.length > NAME_MAX_LENGTH) {
    return `Please shorten your name to ${NAME_MAX_LENGTH} characters or fewer.`
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address.'
  }
  if (email.length > EMAIL_MAX_LENGTH) {
    return 'That email address is too long to be deliverable.'
  }
  if (!message) {
    return 'Please enter a message.'
  }
  if (message.length > MESSAGE_MAX_LENGTH) {
    return `Please shorten your message to ${MESSAGE_MAX_LENGTH} characters or fewer.`
  }
  return null
}
