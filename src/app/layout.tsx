import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Summary — Daily AI News Digest",
  description:
    "Daily curated and AI-summarized news about LLMs, dev tools, research, and the AI industry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        <div className="min-h-screen">
          <header className="border-b border-gray-200">
            <div className="mx-auto max-w-4xl px-4 py-6">
              <a href="/" className="text-2xl font-bold tracking-tight">
                AI Summary
              </a>
              <p className="mt-1 text-sm text-gray-500">
                Daily AI news, curated and summarized
              </p>
            </div>
          </header>
          <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
          <footer className="border-t border-gray-200">
            <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-gray-400">
              Generated daily with Claude &middot;{" "}
              <a href="/archive" className="underline hover:text-gray-600">
                Archive
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
