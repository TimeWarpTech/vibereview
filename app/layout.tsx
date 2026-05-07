import type { Metadata } from "next";
import Link from "next/link";
import { Geist_Mono, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { ParticlesBackground } from "@/components/ParticlesBackground";

const displayFont = Press_Start_2P({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const bodyFont = VT323({ variable: "--font-body", subsets: ["latin"], weight: "400" });
const uiFont = Geist_Mono({ variable: "--font-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VibeReview - anonymous reviews of vibe-coded games",
  description: "Browse and review games. No login. Just opinions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${uiFont.variable} h-full antialiased`}
    >
      <body className="app-shell">
        <ParticlesBackground />
        <header className="site-header">
          <div className="site-header__inner">
            <Link href="/" className="brand-mark">
              <span className="brand-mark__sigil">01</span>
              <span className="brand-mark__text">VibeReview</span>
            </Link>
            <nav className="site-nav">
              <Link href="/" className="site-nav__link">home</Link>
              <Link href="/how-it-works" className="site-nav__link">how it works</Link>
              <Link href="/ideas" className="site-nav__link">ideas</Link>
              <Link href="/changelog" className="site-nav__link">changelog</Link>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <div className="site-footer__box">anonymous arcade reviews. no login. no avatars. just signal.</div>
        </footer>
      </body>
    </html>
  );
}
