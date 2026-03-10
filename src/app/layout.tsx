import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Summary -- Daily AI News Digest",
  description:
    "Daily curated and AI-summarized news about LLMs, dev tools, research, and the AI industry.",
};

/**
 * Inline script that runs before paint to apply the correct theme class
 * to <html>, preventing a flash of wrong theme (FOUC).
 *
 * This is a static, hardcoded script with no user input --
 * dangerouslySetInnerHTML is safe here as the content is fully controlled.
 */
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme') || 'system';
    var dark = theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger -- static script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.className} bg-background text-foreground antialiased`}
      >
        <div className="min-h-screen">
          <header className="border-b border-border">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-6">
              <div>
                <a href="/" className="text-2xl font-bold tracking-tight">
                  AI Summary
                </a>
                <p className="mt-1 text-sm text-secondary">
                  Daily AI news, curated and summarized
                </p>
              </div>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
          <footer className="border-t border-border">
            <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-muted">
              Generated daily with Claude &middot;{" "}
              <a
                href="/archive"
                className="underline hover:text-secondary"
              >
                Archive
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
