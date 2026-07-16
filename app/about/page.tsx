export default function AboutPage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-[18px] py-16 sm:py-24">
      <h1 className="font-mono text-2xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]">About</h1>

      <div className="mt-8 space-y-6 text-[#2B2A26] dark:text-[#EDEFF2] leading-relaxed">
        <p>
          [Origin story. Not "I've always loved computers" — the actual specific moment. How did
          you first get into building things? What was the first thing you made that felt like
          it worked?]
        </p>

        <p>
          [The path from there to now. WordPress/PHP work at Tech Strongbox, your final-year
          project. What made you go from "learning" to "this is what I want to do for work"?]
        </p>

        <p>
          [Reposition line — junior software engineer with WordPress AND full-stack experience,
          not "WordPress developer." Ground it in something concrete: mention the geofencing app
          briefly here as proof, since it shows range beyond WordPress.]
        </p>

        <p>
          [Humility + grit line. Something like: "[a person/mentor/experience] raised my
          standards for what a website should actually do" or "[a specific hard bug] taught me
          that I actually enjoy debugging more than I expected." Should sound like something you'd
          say out loud, not a LinkedIn headline.]
        </p>

        <p>
          [Optional: what you're doing outside of code right now — job hunting, learning
          something specific, side project you're currently mid-way through. Keep it real, not
          padding.]
        </p>
      </div>
    </main>
  )
}
