# AI Summary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a daily AI news aggregator that fetches RSS feeds, summarizes via Claude API, deploys a static Next.js site to Vercel, and sends email digests via Resend.

**Architecture:** Monorepo with GitHub Actions cron pipeline. Scripts fetch RSS → Claude summarizes → JSON digest written → Next.js static export builds pages → Vercel auto-deploys on push to main. Resend sends top-5 email.

**Tech Stack:** Next.js 15 (static export), TypeScript, Tailwind CSS, rss-parser, @anthropic-ai/sdk, resend, js-yaml, GitHub Actions

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `sources.yaml`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
Expected: Next.js project scaffolded in current directory.

**Step 2: Install additional dependencies**

Run:
```bash
npm install rss-parser @anthropic-ai/sdk resend js-yaml date-fns
npm install -D @types/js-yaml tsx
```
Expected: All packages installed.

**Step 3: Configure static export in `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

**Step 4: Create `.env.example`**

```
ANTHROPIC_API_KEY=
RESEND_API_KEY=
RESEND_TO_EMAIL=
RESEND_FROM_EMAIL=
SITE_URL=https://your-site.vercel.app
```

**Step 5: Add `.env.local` to `.gitignore`**

Verify `.gitignore` includes `.env.local` (create-next-app should handle this). Also add:
```
content/digests/*.json
```

**Step 6: Create `sources.yaml`**

```yaml
categories:
  llm_updates:
    name: "LLM Updates"
    feeds:
      - url: "https://www.anthropic.com/feed.xml"
        name: "Anthropic Blog"
      - url: "https://openai.com/blog/rss.xml"
        name: "OpenAI Blog"
      - url: "https://blog.google/technology/ai/rss/"
        name: "Google AI Blog"
      - url: "https://ai.meta.com/blog/rss/"
        name: "Meta AI Blog"
      - url: "https://mistral.ai/feed.xml"
        name: "Mistral AI Blog"

  dev_tools:
    name: "Dev Tools"
    feeds:
      - url: "https://github.blog/feed/"
        name: "GitHub Blog"

  tech_media:
    name: "Tech Media"
    feeds:
      - url: "https://www.theverge.com/ai/rss/index.xml"
        name: "The Verge AI"
      - url: "https://techcrunch.com/category/artificial-intelligence/feed/"
        name: "TechCrunch AI"
      - url: "https://arstechnica.com/ai/feed/"
        name: "Ars Technica AI"
      - url: "https://www.technologyreview.com/feed/"
        name: "MIT Technology Review"

  research:
    name: "Research & Papers"
    feeds:
      - url: "https://arxiv.org/rss/cs.AI"
        name: "arXiv CS.AI"
      - url: "https://arxiv.org/rss/cs.CL"
        name: "arXiv CS.CL"

  community:
    name: "Community"
    feeds:
      - url: "https://hnrss.org/newest?q=AI+LLM+GPT+Claude"
        name: "Hacker News AI"
      - url: "https://simonwillison.net/atom/everything/"
        name: "Simon Willison"
      - url: "https://www.reddit.com/r/MachineLearning/.rss"
        name: "r/MachineLearning"
```

**Step 7: Create `content/digests/` directory**

Run:
```bash
mkdir -p content/digests
touch content/digests/.gitkeep
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with dependencies and sources.yaml"
```

---

### Task 2: Shared Types

**Files:**
- Create: `scripts/types.ts`

**Step 1: Define TypeScript types used across all scripts**

```typescript
export interface FeedSource {
  url: string;
  name: string;
}

export interface SourceCategory {
  name: string;
  feeds: FeedSource[];
}

export interface SourcesConfig {
  categories: Record<string, SourceCategory>;
}

export interface RawArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  source: string;
  category: string;
}

export interface DigestArticle {
  title: string;
  url: string;
  source: string;
  summary: string;
  importance: number; // 1-5
}

export interface DigestCategory {
  name: string;
  slug: string;
  articles: DigestArticle[];
}

export interface DailyDigest {
  date: string; // YYYY-MM-DD
  generatedAt: string; // ISO timestamp
  categories: DigestCategory[];
  totalArticles: number;
}
```

**Step 2: Commit**

```bash
git add scripts/types.ts
git commit -m "feat: add shared TypeScript types for digest pipeline"
```

---

### Task 3: RSS Feed Fetcher

**Files:**
- Create: `scripts/fetch-feeds.ts`
- Create: `scripts/__tests__/fetch-feeds.test.ts`

**Step 1: Write test for feed fetching**

```typescript
import { describe, it, expect } from "vitest";
import { loadSources, fetchAllFeeds } from "../fetch-feeds";

describe("loadSources", () => {
  it("loads and parses sources.yaml", () => {
    const sources = loadSources();
    expect(sources.categories).toBeDefined();
    expect(Object.keys(sources.categories).length).toBeGreaterThan(0);
    const firstCategory = Object.values(sources.categories)[0];
    expect(firstCategory.name).toBeDefined();
    expect(firstCategory.feeds.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Install vitest and configure**

Run:
```bash
npm install -D vitest
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run scripts/__tests__/fetch-feeds.test.ts`
Expected: FAIL — module not found

**Step 4: Implement `scripts/fetch-feeds.ts`**

```typescript
import Parser from "rss-parser";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { subHours } from "date-fns";
import type { SourcesConfig, RawArticle } from "./types";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "AI-Summary-Bot/1.0",
  },
});

export function loadSources(
  sourcesPath = path.join(process.cwd(), "sources.yaml")
): SourcesConfig {
  const raw = fs.readFileSync(sourcesPath, "utf-8");
  return yaml.load(raw) as SourcesConfig;
}

export async function fetchAllFeeds(
  sources: SourcesConfig,
  hoursBack = 24
): Promise<RawArticle[]> {
  const cutoff = subHours(new Date(), hoursBack);
  const articles: RawArticle[] = [];

  for (const [slug, category] of Object.entries(sources.categories)) {
    for (const feed of category.feeds) {
      try {
        console.log(`Fetching: ${feed.name} (${feed.url})`);
        const result = await parser.parseURL(feed.url);

        for (const item of result.items) {
          const pubDate = item.pubDate ? new Date(item.pubDate) : null;
          if (pubDate && pubDate >= cutoff) {
            articles.push({
              title: item.title || "Untitled",
              link: item.link || "",
              pubDate: pubDate.toISOString(),
              contentSnippet: item.contentSnippet?.slice(0, 500) || "",
              source: feed.name,
              category: slug,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${feed.name}: ${error}`);
      }
    }
  }

  return articles;
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run scripts/__tests__/fetch-feeds.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add scripts/fetch-feeds.ts scripts/__tests__/fetch-feeds.test.ts vitest.config.ts package.json
git commit -m "feat: add RSS feed fetcher with sources.yaml loader"
```

---

### Task 4: Claude API Summarizer

**Files:**
- Create: `scripts/summarize.ts`

**Step 1: Implement summarization script**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { RawArticle, DigestCategory } from "./types";

const client = new Anthropic();

export async function summarizeArticles(
  articles: RawArticle[],
  categoryNames: Record<string, string>
): Promise<DigestCategory[]> {
  if (articles.length === 0) {
    return [];
  }

  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] Title: ${a.title}\nSource: ${a.source}\nCategory: ${a.category}\nURL: ${a.link}\nSnippet: ${a.contentSnippet || "N/A"}`
    )
    .join("\n\n");

  const categoryList = Object.entries(categoryNames)
    .map(([slug, name]) => `- ${slug}: ${name}`)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an AI news editor. Given these ${articles.length} RSS articles, produce a JSON digest.

CATEGORIES:
${categoryList}

ARTICLES:
${articleList}

Respond with ONLY valid JSON matching this schema:
{
  "categories": [
    {
      "name": "Category Display Name",
      "slug": "category_slug",
      "articles": [
        {
          "title": "Article title",
          "url": "https://...",
          "source": "Source name",
          "summary": "2-3 sentence summary of the key points.",
          "importance": 4
        }
      ]
    }
  ]
}

Rules:
- importance is 1-5 (5 = breaking/major release, 1 = minor)
- Sort articles within each category by importance (highest first)
- Filter out duplicates and obviously irrelevant articles
- Keep summaries concise: 2-3 sentences max
- Only include categories that have articles`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return parsed.categories as DigestCategory[];
  } catch (error) {
    console.error("Failed to parse Claude response:", error);
    console.error("Raw response:", text);

    // Fallback: return raw articles grouped by category without summaries
    return fallbackGrouping(articles, categoryNames);
  }
}

function fallbackGrouping(
  articles: RawArticle[],
  categoryNames: Record<string, string>
): DigestCategory[] {
  const grouped: Record<string, DigestCategory> = {};

  for (const article of articles) {
    if (!grouped[article.category]) {
      grouped[article.category] = {
        name: categoryNames[article.category] || article.category,
        slug: article.category,
        articles: [],
      };
    }
    grouped[article.category].articles.push({
      title: article.title,
      url: article.link,
      source: article.source,
      summary: article.contentSnippet || "No summary available.",
      importance: 3,
    });
  }

  return Object.values(grouped);
}
```

**Step 2: Commit**

```bash
git add scripts/summarize.ts
git commit -m "feat: add Claude API summarizer with fallback"
```

---

### Task 5: Digest Generator (Orchestrator)

**Files:**
- Create: `scripts/generate-digest.ts`

**Step 1: Implement the orchestrator that ties fetch + summarize together**

```typescript
import * as fs from "fs";
import * as path from "path";
import { format } from "date-fns";
import { loadSources, fetchAllFeeds } from "./fetch-feeds";
import { summarizeArticles } from "./summarize";
import type { DailyDigest } from "./types";

async function main() {
  const today = format(new Date(), "yyyy-MM-dd");
  const outputDir = path.join(process.cwd(), "content", "digests");
  const outputPath = path.join(outputDir, `${today}.json`);

  console.log(`Generating digest for ${today}...`);

  // 1. Load sources
  const sources = loadSources();
  const categoryNames: Record<string, string> = {};
  for (const [slug, cat] of Object.entries(sources.categories)) {
    categoryNames[slug] = cat.name;
  }

  // 2. Fetch feeds
  const articles = await fetchAllFeeds(sources);
  console.log(`Fetched ${articles.length} articles from last 24 hours`);

  if (articles.length === 0) {
    console.log("No new articles found. Skipping digest generation.");
    process.exit(0);
  }

  // 3. Summarize with Claude
  const categories = await summarizeArticles(articles, categoryNames);

  // 4. Build digest
  const totalArticles = categories.reduce(
    (sum, cat) => sum + cat.articles.length,
    0
  );

  const digest: DailyDigest = {
    date: today,
    generatedAt: new Date().toISOString(),
    categories,
    totalArticles,
  };

  // 5. Write JSON
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(digest, null, 2));
  console.log(`Digest written to ${outputPath} (${totalArticles} articles)`);
}

main().catch((err) => {
  console.error("Digest generation failed:", err);
  process.exit(1);
});
```

**Step 2: Add npm script**

Add to `package.json` scripts:
```json
"generate": "tsx scripts/generate-digest.ts"
```

**Step 3: Commit**

```bash
git add scripts/generate-digest.ts package.json
git commit -m "feat: add digest generator orchestrator script"
```

---

### Task 6: Prune Old Digests

**Files:**
- Create: `scripts/prune-old-digests.ts`

**Step 1: Implement pruning script**

```typescript
import * as fs from "fs";
import * as path from "path";
import { subDays, format, parse, isValid } from "date-fns";

const RETENTION_DAYS = 30;

function main() {
  const digestDir = path.join(process.cwd(), "content", "digests");
  const cutoff = subDays(new Date(), RETENTION_DAYS);

  if (!fs.existsSync(digestDir)) {
    console.log("No digest directory found.");
    return;
  }

  const files = fs.readdirSync(digestDir).filter((f) => f.endsWith(".json"));
  let pruned = 0;

  for (const file of files) {
    const dateStr = file.replace(".json", "");
    const date = parse(dateStr, "yyyy-MM-dd", new Date());

    if (isValid(date) && date < cutoff) {
      fs.unlinkSync(path.join(digestDir, file));
      console.log(`Pruned: ${file}`);
      pruned++;
    }
  }

  console.log(`Pruned ${pruned} old digests (keeping last ${RETENTION_DAYS} days).`);
}

main();
```

**Step 2: Add npm script**

Add to `package.json` scripts:
```json
"prune": "tsx scripts/prune-old-digests.ts"
```

**Step 3: Commit**

```bash
git add scripts/prune-old-digests.ts package.json
git commit -m "feat: add digest pruning script (30-day retention)"
```

---

### Task 7: Email Sender (Resend)

**Files:**
- Create: `scripts/send-email.ts`

**Step 1: Implement email sender**

```typescript
import * as fs from "fs";
import * as path from "path";
import { format } from "date-fns";
import { Resend } from "resend";
import type { DailyDigest } from "./types";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.RESEND_TO_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "digest@resend.dev";
  const siteUrl = process.env.SITE_URL || "https://ai-summary.vercel.app";

  if (!apiKey || !toEmail) {
    console.warn("RESEND_API_KEY or RESEND_TO_EMAIL not set. Skipping email.");
    return;
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const digestPath = path.join(
    process.cwd(),
    "content",
    "digests",
    `${today}.json`
  );

  if (!fs.existsSync(digestPath)) {
    console.warn(`No digest found for ${today}. Skipping email.`);
    return;
  }

  const digest: DailyDigest = JSON.parse(fs.readFileSync(digestPath, "utf-8"));

  // Get top 5 articles by importance across all categories
  const allArticles = digest.categories.flatMap((cat) =>
    cat.articles.map((a) => ({ ...a, categoryName: cat.name }))
  );
  allArticles.sort((a, b) => b.importance - a.importance);
  const top5 = allArticles.slice(0, 5);

  const formattedDate = format(new Date(today), "MMMM d, yyyy");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h1 style="font-size: 24px; margin-bottom: 4px;">AI Digest</h1>
  <p style="color: #666; margin-top: 0;">${formattedDate} &middot; ${digest.totalArticles} articles</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
  <h2 style="font-size: 18px;">Top Stories</h2>
  ${top5
    .map(
      (a) => `
    <div style="margin-bottom: 16px;">
      <a href="${a.url}" style="color: #0066cc; text-decoration: none; font-weight: 600;">${a.title}</a>
      <p style="margin: 4px 0; color: #444; font-size: 14px;">${a.summary}</p>
      <p style="margin: 0; color: #888; font-size: 12px;">${a.source} &middot; ${a.categoryName}</p>
    </div>`
    )
    .join("")}
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
  <p><a href="${siteUrl}/digest/${today}" style="color: #0066cc; font-weight: 600;">Read the full digest &rarr;</a></p>
</body>
</html>`;

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `AI Digest — ${formattedDate}`,
      html,
    });
    console.log(`Email sent to ${toEmail}`);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

main().catch((err) => {
  console.error("Email sending failed:", err);
  process.exit(1);
});
```

**Step 2: Add npm script**

Add to `package.json` scripts:
```json
"send-email": "tsx scripts/send-email.ts"
```

**Step 3: Commit**

```bash
git add scripts/send-email.ts package.json
git commit -m "feat: add Resend email sender for daily digest"
```

---

### Task 8: Next.js Digest Page

**Files:**
- Create: `src/lib/digests.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/digest/[date]/page.tsx`

**Step 1: Create digest data loader**

Create `src/lib/digests.ts`:

```typescript
import fs from "fs";
import path from "path";
import type { DailyDigest } from "../../scripts/types";

const DIGEST_DIR = path.join(process.cwd(), "content", "digests");

export function getAllDigestDates(): string[] {
  if (!fs.existsSync(DIGEST_DIR)) return [];
  return fs
    .readdirSync(DIGEST_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort()
    .reverse();
}

export function getDigest(date: string): DailyDigest | null {
  const filePath = path.join(DIGEST_DIR, `${date}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function getLatestDigestDate(): string | null {
  const dates = getAllDigestDates();
  return dates[0] || null;
}
```

**Step 2: Update layout**

Replace `src/app/layout.tsx`:

```tsx
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
```

**Step 3: Create home page**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getLatestDigestDate } from "@/lib/digests";

export default function Home() {
  const latest = getLatestDigestDate();
  if (latest) {
    redirect(`/digest/${latest}`);
  }

  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold">No digests yet</h1>
      <p className="mt-4 text-gray-500">
        The first digest will appear after the daily pipeline runs.
      </p>
    </div>
  );
}
```

**Step 4: Create digest page**

Create `src/app/digest/[date]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { format, parse } from "date-fns";
import { getDigest, getAllDigestDates } from "@/lib/digests";

export function generateStaticParams() {
  return getAllDigestDates().map((date) => ({ date }));
}

interface Props {
  params: Promise<{ date: string }>;
}

export default async function DigestPage({ params }: Props) {
  const { date } = await params;
  const digest = getDigest(date);
  if (!digest) notFound();

  const formattedDate = format(
    parse(date, "yyyy-MM-dd", new Date()),
    "EEEE, MMMM d, yyyy"
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">AI Digest</h1>
        <p className="mt-1 text-gray-500">
          {formattedDate} &middot; {digest.totalArticles} articles
        </p>
      </div>

      {digest.categories.map((category) => (
        <section key={category.slug} className="mb-10">
          <h2 className="mb-4 text-xl font-semibold border-b border-gray-100 pb-2">
            {category.name}
          </h2>
          <div className="space-y-4">
            {category.articles.map((article, i) => (
              <article key={i} className="group">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      article.importance >= 4
                        ? "bg-red-500"
                        : article.importance >= 3
                          ? "bg-orange-400"
                          : "bg-gray-300"
                    }`}
                  >
                    {article.importance}
                  </span>
                  <div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {article.title}
                    </a>
                    <p className="mt-1 text-sm text-gray-600">
                      {article.summary}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {article.source}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Builds successfully (no digests yet, home shows empty state)

**Step 6: Commit**

```bash
git add src/ scripts/types.ts
git commit -m "feat: add Next.js digest pages with layout and routing"
```

---

### Task 9: Archive Page

**Files:**
- Create: `src/app/archive/page.tsx`

**Step 1: Create archive page**

```tsx
import { getAllDigestDates } from "@/lib/digests";
import { format, parse } from "date-fns";

export default function ArchivePage() {
  const dates = getAllDigestDates();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Archive</h1>
      {dates.length === 0 ? (
        <p className="text-gray-500">No digests yet.</p>
      ) : (
        <ul className="space-y-2">
          {dates.map((date) => {
            const formatted = format(
              parse(date, "yyyy-MM-dd", new Date()),
              "EEEE, MMMM d, yyyy"
            );
            return (
              <li key={date}>
                <a
                  href={`/digest/${date}`}
                  className="text-blue-700 hover:underline"
                >
                  {formatted}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/archive/page.tsx
git commit -m "feat: add archive page listing past digests"
```

---

### Task 10: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/daily-digest.yml`

**Step 1: Create the workflow file**

```yaml
name: Daily AI Digest

on:
  schedule:
    # Runs at 7:00 AM UTC daily — adjust to your timezone
    - cron: "0 7 * * *"
  workflow_dispatch: # Allow manual trigger

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate digest
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npm run generate

      - name: Prune old digests
        run: npm run prune

      - name: Send email digest
        env:
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          RESEND_TO_EMAIL: ${{ secrets.RESEND_TO_EMAIL }}
          RESEND_FROM_EMAIL: ${{ secrets.RESEND_FROM_EMAIL }}
          SITE_URL: ${{ secrets.SITE_URL }}
        run: npm run send-email

      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add content/digests/
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore: daily digest $(date +%Y-%m-%d)"
            git push
          fi
```

**Step 2: Commit**

```bash
git add .github/workflows/daily-digest.yml
git commit -m "feat: add GitHub Actions daily digest workflow"
```

---

### Task 11: Vercel Configuration

**Files:**
- Create: `vercel.json`

**Step 1: Create Vercel config**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "out",
  "framework": "nextjs"
}
```

**Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel deployment configuration"
```

---

### Task 12: Manual Test Run

**Step 1: Set up `.env.local`**

Create `.env.local` with your actual keys:
```
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
RESEND_TO_EMAIL=your@email.com
RESEND_FROM_EMAIL=digest@resend.dev
SITE_URL=http://localhost:3000
```

**Step 2: Run the full pipeline locally**

Run:
```bash
npm run generate
```
Expected: `content/digests/2026-03-09.json` created with summarized articles.

**Step 3: Verify the site builds with digest data**

Run:
```bash
npm run build && npx serve out
```
Expected: Site builds, navigate to `http://localhost:3000` and see today's digest.

**Step 4: Test email sending**

Run:
```bash
npm run send-email
```
Expected: Email received in your inbox.

**Step 5: Commit the sample digest (optional, for initial deploy)**

```bash
git add content/digests/
git commit -m "chore: add initial test digest"
```

---

### Task 13: GitHub Repo + Vercel Deploy

**Step 1: Create GitHub repo**

Run:
```bash
gh repo create AI-Summary --public --source=. --push
```

**Step 2: Add GitHub Secrets**

Run (or do via GitHub UI):
```bash
gh secret set ANTHROPIC_API_KEY
gh secret set RESEND_API_KEY
gh secret set RESEND_TO_EMAIL
gh secret set RESEND_FROM_EMAIL
gh secret set SITE_URL
```

**Step 3: Connect to Vercel**

Run:
```bash
npx vercel --prod
```
Expected: Site deployed to Vercel. Note the URL and update `SITE_URL` secret.

**Step 4: Trigger a manual workflow run**

Run:
```bash
gh workflow run daily-digest.yml
```
Expected: Workflow runs, generates digest, pushes, Vercel auto-deploys.

---

## Summary of npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `generate` | `tsx scripts/generate-digest.ts` | Fetch + summarize + write JSON |
| `prune` | `tsx scripts/prune-old-digests.ts` | Remove digests > 30 days |
| `send-email` | `tsx scripts/send-email.ts` | Send top-5 email via Resend |
| `test` | `vitest run` | Run tests |
| `dev` | `next dev` | Local dev server |
| `build` | `next build` | Static export build |

## Execution Order

Tasks 1-7 are backend/scripts (can be tested independently).
Tasks 8-9 are frontend (depend on types from Task 2).
Tasks 10-11 are CI/CD config.
Tasks 12-13 are integration testing and deployment.
