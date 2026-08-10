export type Project = {
  slug: string
  title: string
  hook: string
  /** 2-3 sentences rendered on the single-page projects card. */
  description: string
  stack: string[]
  /** Reserved for Tech Strongbox client work that becomes publicly viewable. */
  liveUrl?: string
  repoUrl?: string
}

export const PROJECTS: Project[] = [
  {
    slug: 'geofencing-app',
    title: 'Cleaning Service Booking App',
    hook: 'A home-cleaning service booking app that geofences the cleaner and alerts the customer when they arrive or leave.',
    description:
      "A home cleaning service booking platform with a Laravel API and a Flutter app. Customers book a cleaner, pay through Stripe, and get a notification the moment the cleaner arrives or leaves, using background geofencing. Built as my final year project, and the part that took longest was making those geofence triggers fire reliably while the phone was asleep.",
    stack: ['Laravel', 'Flutter', 'Firebase', 'Stripe', 'Pusher'],
  },
  {
    slug: 'tech-strongbox-project',
    title: 'Tech Strongbox Client Work',
    hook: "A few client sites I've worked on as a junior developer at Tech Strongbox. Case studies coming soon.",
    description:
      "Client sites I work on as a junior developer at Tech Strongbox. Mostly WordPress, which means theme work, plugin customisation, and tracking down conflicts that only show up in production. The specifics stay with the clients, but this is where most of my day to day experience comes from.",
    stack: ['WordPress', 'PHP'],
  },
  {
    slug: 'ai-assisted-project',
    title: 'Finance Management',
    hook: 'A personal finance tracker for budgets, categories, and transactions, built with AI assistance from planning through deployment.',
    description:
      "A personal finance tracker for budgets, categories and transactions, with an Angular frontend and an ASP.NET Core API. I built it with heavy AI assistance from planning through to deployment. I mention that because the interesting part was learning where the help stops being useful and you have to understand the thing yourself.",
    stack: ['Angular', 'ASP.NET Core', 'C#', 'Docker'],
    repoUrl: 'https://github.com/Wenhao0706/Finance-management',
  },
]
