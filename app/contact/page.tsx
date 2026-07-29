import { ContactForm } from '@/components/ContactForm'
import { EMAIL, WHATSAPP_URL } from '@/lib/site'
import { ACCENT_LINK, PAGE_HEADING, PAGE_MAIN } from '@/lib/ui'

export default function ContactPage() {
  return (
    <main className={PAGE_MAIN}>
      <h1 className={PAGE_HEADING}>Let&apos;s talk</h1>
      <p className="mt-3 text-[#7A7568] dark:text-[#8A9099]">
        Open to junior developer roles, and available for freelance work. Either way, this
        reaches me directly.
      </p>

      <ContactForm />

      <p className="mt-10 text-sm text-[#7A7568] dark:text-[#8A9099]">
        Rather not use the form? Email{' '}
        <a href={`mailto:${EMAIL}`} className={ACCENT_LINK}>
          {EMAIL}
        </a>{' '}
        or{' '}
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={ACCENT_LINK}>
          message me on WhatsApp
        </a>
        .
      </p>
    </main>
  )
}
