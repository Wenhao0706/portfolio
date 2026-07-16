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

      <a
        href="mailto:[your-email@example.com]"
        className="mt-8 inline-block font-mono text-lg text-[#B5772E] dark:text-[#D9A441] border-b border-[#B5772E] dark:border-[#D9A441] hover:opacity-80 transition-opacity"
      >
        [your-email@example.com]
      </a>

      <p className="mt-10 text-sm text-[#7A7568] dark:text-[#8A9099]">
        [Optional: GitHub / LinkedIn links here, kept secondary — not the main call to action.]
      </p>
    </main>
  )
}
