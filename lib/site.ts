/**
 * Shared contact details, so the footer and the contact page can never drift apart.
 */

export const EMAIL = 'manhou688@gmail.com'

export const GITHUB_URL = 'https://github.com/Wenhao0706'

/**
 * wa.me wants digits only in full international form: no `+`, no dashes, and no
 * leading trunk zero. Malaysia is +60, so 011-3765 3753 becomes 60 11 3765 3753.
 */
export const WHATSAPP_NUMBER = '601137653753'

/**
 * Prefills the VISITOR's compose box, so it is phrased as something they are
 * sending to Man Hou, not something he is saying. Naming the site means an
 * enquiry that arrives this way is identifiable as a portfolio lead.
 * WhatsApp lets the sender edit it before sending.
 */
export const WHATSAPP_MESSAGE =
  'Hi Man Hou, I came across your portfolio at manhou.de and would like to get in touch.'

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`
