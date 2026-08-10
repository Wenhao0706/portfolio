import { ContactForm } from '@/components/ContactForm'
import { EMAIL, WHATSAPP_URL } from '@/lib/site'
import { ACCENT_LINK, SECTION_HEADING } from '@/lib/ui'

export function Contact() {
  return (
    <section id="contact" data-reveal="contact" className="mt-20 scroll-mt-24">
      <h2 className={`${SECTION_HEADING} opacity-0 translate-y-2`}>Let&apos;s talk</h2>
      <p className="mt-3 max-w-2xl text-[#7A7568] dark:text-[#8A9099] opacity-0 translate-y-2">
        Open to junior developer roles, and available for freelance work. Either way, this
        reaches me directly.
      </p>

      <div className="opacity-0 translate-y-2">
        <ContactForm />
      </div>

      <p className="mt-10 text-sm text-[#7A7568] dark:text-[#8A9099] opacity-0 translate-y-2">
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
    </section>
  )
}
