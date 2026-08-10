import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The site collapsed from five routes to one. These paths are still live in
     the wild: the resume links to them, and the chatbot's offline and rate-limit
     replies tell visitors to use the contact form. 308 so they are cached as
     permanent and search engines transfer any accumulated signal. */
  async redirects() {
    return [
      { source: '/about', destination: '/#about', permanent: true },
      { source: '/projects', destination: '/#projects', permanent: true },
      { source: '/projects/:slug', destination: '/#projects', permanent: true },
      { source: '/contact', destination: '/#contact', permanent: true },
    ]
  },
};

export default nextConfig;
