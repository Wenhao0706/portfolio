import Image from 'next/image'

function TypedWords({ text, offsetClass }: { text: string; offsetClass: string }) {
  const wordSpans = text.split(' ').map((word, wi) => (
    <span key={wi} className="inline-block whitespace-nowrap">
      {word.split('').map((char, ci) => (
        <span
          key={ci}
          data-letter
          className={`inline-block whitespace-pre opacity-0 ${offsetClass}`}
        >
          {char}
        </span>
      ))}
    </span>
  ))

  // Real breakable spaces go *between* word spans, not inside them, so
  // wrapping only ever happens at word boundaries, never mid-word.
  return wordSpans.reduce<React.ReactNode[]>((acc, el, i) => {
    if (i > 0) acc.push(' ')
    acc.push(el)
    return acc
  }, [])
}

export function Hero() {
  return (
    <section
      id="top"
      className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p
          data-reveal="hi"
          className="font-mono text-xs text-[#B5772E] dark:text-[#D9A441]"
        >
          <TypedWords text="Hi, I'm" offsetClass="translate-y-1.5" />
        </p>
        <h1
          data-reveal="name"
          className="mt-2 font-mono text-3xl sm:text-4xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]"
        >
          <TypedWords text="Yoon Man Hou" offsetClass="translate-y-1.5" />
        </h1>
        <p
          data-reveal="tagline"
          className="mt-4 font-sans text-base sm:text-lg leading-relaxed text-[#7A7568] dark:text-[#8A9099] max-w-xl"
        >
          <TypedWords
            text="Thanks for stopping by. I work as a WordPress/PHP developer during the day, and I'm using my free time to learn React and Node by building this site. Below you'll find some of what I've worked on, real client projects and a few things I built just to learn. Got something to say or looking to hire? Just reach out."
            offsetClass="translate-y-1"
          />
        </p>
        <div data-reveal="cta" className="mt-8 flex gap-3">
          <a
            href="/resume.pdf"
            download
            className="font-mono text-sm border border-[#B5772E] dark:border-[#D9A441] text-[#B5772E] dark:text-[#D9A441] px-4 py-2 rounded-[5px] hover:bg-[#B5772E] dark:hover:bg-[#D9A441] hover:text-[#F1EBE0] dark:hover:text-[#14171C] transition-colors opacity-0 translate-y-2"
          >
            Download resume
          </a>
        </div>
      </div>
      <div data-reveal="photo" className="relative shrink-0 group opacity-0 -translate-y-24">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-[#6B9BD1] opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
        />
        <div className="animate-float">
          <Image
            src="/images/yoon-man-hou.png"
            alt="Yoon Man Hou"
            width={180}
            height={231}
            priority
            className="relative max-w-[180px] object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out group-hover:-rotate-3 group-hover:scale-105"
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>
      </div>
    </section>
  )
}
