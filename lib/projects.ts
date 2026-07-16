export type Project = {
  slug: string
  title: string
  hook: string
  stack: string[]
  role: string
  liveUrl?: string
  repoUrl?: string
  introduction: string
  purposeAndGoal: string
  spotlight: string
  currentStatus?: string
  lessonsLearned: string
}

export const PROJECTS: Project[] = [
  {
    slug: 'geofencing-app',
    title: 'Cleaning Service Booking App',
    hook: 'A home-cleaning service booking app that geofences the cleaner and alerts the customer when they arrive or leave.',
    stack: ['Flutter', 'Firebase', 'Stripe', 'Pusher'],
    role: '[Solo final-year project / your role if it was a team project]',
    // liveUrl: '[link to a demo video or store listing, if you have one]',
    // repoUrl: '[link to GitHub repo, if public]',
    introduction:
      '[What the app does, in plain terms. What are the 2-3 core features? What problem does geofencing solve here?]',
    purposeAndGoal:
      '[Why did you pick this as your final-year project? What was the brief, and what did you set out to prove — technically or personally?]',
    spotlight:
      '[The hardest part. Likely candidates: getting geofence triggers reliable in the background, wiring Stripe payments end-to-end, real-time updates via Pusher. Pick ONE and go deep: what broke, what you tried, what actually fixed it.]',
    currentStatus: '[Is anyone using it? Still running, or was it a one-time academic submission?]',
    lessonsLearned:
      '[What you would do differently now. What did this teach you that shows up in how you code today?]',
  },
  {
    slug: 'tech-strongbox-project',
    title: 'Tech Strongbox Client Work',
    hook: "A few client sites I've worked on as a junior developer at Tech Strongbox. Case studies coming soon.",
    stack: ['WordPress', 'PHP'],
    role: '[Junior developer at Tech Strongbox — describe your actual scope: theme work, plugin customization, performance, etc.]',
    introduction:
      '[What the site/feature does. Who is the client, broadly (no NDA-protected specifics). What did you personally build or fix?]',
    purposeAndGoal:
      '[What was the client\'s problem before this work? What outcome were they after?]',
    spotlight:
      '[The trickiest technical bit — a plugin conflict, a performance fix, a custom PHP feature, migrating something. Go deep on ONE.]',
    currentStatus: '[Still live for the client? Any measurable impact you can mention without breaching confidentiality?]',
    lessonsLearned:
      '[What working on a real paying client taught you that a personal project can\'t.]',
  },
  {
    slug: 'ai-assisted-project',
    title: 'Finance Management',
    hook: 'A personal finance tracker for budgets, categories, and transactions, built with AI assistance from planning through deployment.',
    stack: ['Angular', 'ASP.NET Core', 'C#', 'Docker'],
    role: '[Your role — building with AI assistance, and what you personally directed/reviewed/learned]',
    introduction:
      '[What it does. Be upfront that you built this with AI assistance (Claude Code or similar) — that honesty is the point, not something to hide.]',
    purposeAndGoal:
      '[Why build this specific thing? What made you curious about it?]',
    spotlight:
      '[What did you have to understand yourself to make this work, even with AI help? What decisions were yours? This is the part that proves you\'re not just copy-pasting — pick a real technical decision you made or a bug you had to actually debug.]',
    lessonsLearned:
      '[What you learned about the tools, the tech, and your own limits. What are you still learning about how it works under the hood?]',
  },
]

export function getProjectBySlug(slug: string) {
  return PROJECTS.find((project) => project.slug === slug)
}
