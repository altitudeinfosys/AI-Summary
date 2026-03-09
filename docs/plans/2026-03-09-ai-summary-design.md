# AI Summary — Daily AI News Digest

## Overview

A daily AI news aggregator that fetches RSS feeds from official blogs, tech media, research sources, and community sites, uses Claude API to summarize and categorize articles, and deploys a static Next.js site to Vercel. Sends a daily email digest via Resend.

## Architecture

**Approach:** Monorepo with GitHub Actions pipeline

```
sources.yaml ──→ GitHub Actions Cron (daily 7am)
                        │
                        ▼
                  Fetch RSS Feeds (rss-parser)
                        │
                        ▼
                  Claude API (summarize + categorize)
                        │
                        ▼
                  Generate MDX digest file
                        │
                        ▼
                  Send email via Resend (top 5 headlines)
                        │
                        ▼
                  Git commit + push to main
                        │
                        ▼
                  Vercel auto-deploys
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| RSS Fetcher | `rss-parser` (npm) | Fetch feeds from `sources.yaml` |
| AI Summarizer | Claude API (`@anthropic-ai/sdk`) | Summarize, categorize, rank articles |
| Static Site | Next.js 15 (static export) | Render daily digest pages |
| Styling | Tailwind CSS | Clean, responsive design |
| Email | Resend SDK | Daily top-5 email digest |
| Scheduling | GitHub Actions cron | Run pipeline daily |
| Deploy | Vercel | Auto-deploy on push to main |
| Config | `sources.yaml` | Editable list of RSS feeds by category |

## Project Structure

```
AI_Summary/
├── .github/
│   └── workflows/
│       └── daily-digest.yml        # Cron job: fetch, summarize, deploy
├── content/
│   └── digests/
│       └── 2026-03-09.json         # Generated daily digest data
├── scripts/
│   ├── fetch-feeds.ts              # RSS fetcher
│   ├── summarize.ts                # Claude API summarization
│   ├── generate-digest.ts          # Orchestrates fetch → summarize → write
│   ├── send-email.ts               # Resend email sender
│   └── prune-old-digests.ts        # Remove digests older than 30 days
├── src/
│   └── app/
│       ├── page.tsx                # Home — redirects to latest digest
│       ├── digest/
│       │   └── [date]/
│       │       └── page.tsx        # Individual digest page
│       ├── archive/
│       │   └── page.tsx            # Last 30 days listing
│       └── layout.tsx              # Shared layout
├── sources.yaml                    # Configurable feed list
├── .env.local                      # Local env vars (not committed)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Page Routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to latest digest |
| `/digest/2026-03-09` | Specific day's digest |
| `/archive` | Browsable list of last 30 days |

## Digest Categories

1. **LLM Updates** — Claude, ChatGPT, Gemini, Llama, Mistral, Grok releases
2. **Dev Tools** — Claude Code, Copilot, Cursor, Devin, Windsurf, v0, Bolt
3. **Research & Papers** — arXiv, benchmarks, safety/alignment
4. **Tech Media** — The Verge, TechCrunch, Ars Technica, MIT Tech Review
5. **Policy & Regulation** — AI governance, legislation, safety
6. **Funding & Startups** — Funding rounds, acquisitions, new companies
7. **Hardware & Infrastructure** — Chips, GPUs, data centers
8. **Community** — Hacker News, Reddit, newsletters, blogs

## Sources Configuration (`sources.yaml`)

Editable YAML file. Add/remove feeds without code changes.

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

## Environment Variables

| Variable | Purpose | Where |
|----------|---------|-------|
| `ANTHROPIC_API_KEY` | Claude API for summarization | `.env.local` + GitHub Secrets |
| `RESEND_API_KEY` | Sending email digests | `.env.local` + GitHub Secrets |
| `RESEND_TO_EMAIL` | Recipient email | `.env.local` + GitHub Secrets |
| `RESEND_FROM_EMAIL` | Sender address | `.env.local` + GitHub Secrets |

## Daily Pipeline (GitHub Actions)

1. Trigger: cron `0 7 * * *` (7:00 AM, configurable timezone)
2. Checkout repo
3. Install dependencies
4. Run `scripts/generate-digest.ts`:
   a. Read `sources.yaml`
   b. Fetch all RSS feeds via `rss-parser`
   c. Filter to articles published in last 24 hours
   d. Deduplicate by URL/title similarity
   e. Send to Claude API for summarization + categorization
   f. Write `content/digests/YYYY-MM-DD.json`
5. Run `scripts/prune-old-digests.ts` (remove > 30 days)
6. Run `scripts/send-email.ts` (top 5 via Resend)
7. Git commit + push to `main`
8. Vercel auto-deploys from `main`

## Claude API Prompt Strategy

Send articles in batch per category. Prompt:

```
You are an AI news editor. Given these RSS articles, produce a JSON digest:
- For each article: title, source, url, 2-3 sentence summary, importance (1-5)
- Categorize into the provided categories
- Highlight breaking news or major releases
- Filter out duplicates and low-quality/irrelevant items
```

## Email Format (Resend)

Subject: `AI Digest — March 9, 2026`

Body:
- Top 5 stories with 1-line summaries
- "Read the full digest →" link to Vercel site
- Clean HTML email template

## Error Handling

| Scenario | Behavior |
|----------|----------|
| RSS feed down | Skip feed, log warning, continue |
| Claude API fails | Retry once, then fall back to raw headlines |
| Resend fails | Log error, site still deploys |
| No new articles | Skip generation, no deploy |
| Git push fails | Fail the action, alert via GH notification |

## Retention

- Keep last 30 days of digests
- `prune-old-digests.ts` runs as part of daily pipeline
- Deletes JSON files and removes from git

## Future Enhancements (Not in v1)

- LinkedIn as additional source
- AI news website RSS feeds (expandable via `sources.yaml`)
- Search across past digests
- Bookmarking/favoriting stories
- Weekly summary email in addition to daily
- Dark mode toggle
