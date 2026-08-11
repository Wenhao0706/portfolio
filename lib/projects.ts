/** One live site a visitor can go and look at. */
export type ProjectSite = { label: string; href: string }

export type Project = {
  slug: string
  title: string
  hook: string
  /** 2-3 sentences rendered on the single-page projects card. */
  description: string
  stack: string[]
  /**
   * Public sites he built as sole developer. Client work that was only maintained or
   * extended is deliberately NOT listed: a link says "I built this", and the
   * maintenance sites belong to brands whose builds are not his.
   *
   * Naming a client publicly is the owner's call to justify, not this file's — the
   * basis is unrecorded and the resume does not name these five. See
   * tasks/portfolio/content-pages/current.md before adding or removing one.
   */
  sites?: ProjectSite[]
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
    title: 'Tech Strongbox Client & Internal Work',
    hook: 'Five client sites built from scratch as sole developer, plus the internal platforms and automation behind them.',
    description:
      "Client sites I build and maintain at Tech Strongbox. Five of them I built from scratch as the sole developer, gathering the requirements with the client myself and running revisions through to sign-off, writing custom JavaScript and GSAP scroll animations for the parts a page builder cannot reach. The rest of the work is custom PHP against client CRMs, a WooCommerce voucher engine with a redemption cap, improving the UI of the company's own property platforms for non-technical staff, and a Node.js service that scrapes property development data into draft blog posts for staff to review before publishing.",
    stack: ['WordPress', 'PHP', 'Next.js', 'Node.js', 'JavaScript', 'GSAP', 'HTML', 'CSS'],
    sites: [
      { label: 'DLA Engineering Services', href: 'https://dlaeng.com.my/' },
      { label: 'Trainergy', href: 'https://trainergy.com/' },
      { label: 'Ria Sunsuria', href: 'https://riasunsuria.com/' },
      { label: 'Jasa Sarjana', href: 'https://www.jasasarjana.com.my/' },
      { label: 'Tech Strongbox', href: 'https://techstrongbox.com/' },
    ],
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
