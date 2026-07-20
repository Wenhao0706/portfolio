import { ContactForm } from '@/components/ContactForm'

export default function ContactPage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-[18px] py-16 sm:py-24">
      <h1 className="font-mono text-2xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]">
        Let's talk
      </h1>
      <p className="mt-3 text-[#7A7568] dark:text-[#8A9099]">
        [One line — e.g. "Open to junior software / full-stack roles. Reach out if you're
        hiring, or just want to talk shop."]
      </p>

      <ContactForm />

      <p className="mt-10 text-sm text-[#7A7568] dark:text-[#8A9099]">
        [Optional: GitHub / LinkedIn links here, kept secondary — not the main call to action.]
      </p>
    </main>
  )
}
