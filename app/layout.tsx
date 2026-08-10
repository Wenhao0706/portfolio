import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import Header from "@/components/header/Header";
import Backdrop from "@/components/Backdrop";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import ChatWidget from "@/components/chat/ChatWidget";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Man Hou - Web Developer",
  description: "Portfolio of Man Hou, a web developer.",
};

const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="no-flash-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
        />
        {/* Wraps the whole tree, not just the header. The terminal's `theme`
            command toggles the same context the header button does, so the two
            controls can never disagree about which theme is on. Passing server
            components through as children keeps them on the server; only the
            provider itself ships. */}
        <ThemeProvider>
          <Backdrop />
          <Header />
          {children}
          <Footer />
          <ScrollToTop />
          <ChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
