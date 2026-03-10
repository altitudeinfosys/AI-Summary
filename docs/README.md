# AI Summary — Documentation

## Overview

AI Summary is an automated daily AI news aggregator that:

1. **Fetches** articles from 11+ RSS feeds covering AI news
2. **Summarizes** them using Claude API (importance-scored, categorized)
3. **Publishes** a static website on Vercel
4. **Emails** a daily digest via Resend

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              GitHub Actions (daily cron)         │
│                    7:00 AM UTC                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. npm run generate                            │
│     ├── fetch-feeds.ts  → RSS feeds             │
│     ├── summarize.ts    → Claude API            │
│     └── writes content/digests/YYYY-MM-DD.json  │
│                                                 │
│  2. npm run prune                               │
│     └── removes digests older than 30 days      │
│                                                 │
│  3. npm run send-email                          │
│     └── sends top 5 articles via Resend         │
│                                                 │
│  4. git commit + push                           │
│     └── triggers Vercel auto-deploy             │
│                                                 │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐    ┌──────────────────────┐
│   Vercel (static)   │    │   Email (Resend)     │
│   ai-summary.       │    │   tareka@gmail.com   │
│   vercel.app        │    │                      │
└─────────────────────┘    └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (static export) |
| Styling | Tailwind CSS v4 |
| AI | Claude API (claude-sonnet-4-20250514) |
| Email | Resend |
| RSS | rss-parser |
| CI/CD | GitHub Actions |
| Hosting | Vercel |
| Language | TypeScript |

---

## Project Structure

```
AI_Summary/
├── .github/workflows/
│   └── daily-digest.yml        # Cron job (7am UTC daily)
├── content/digests/
│   └── 2026-03-09.json         # Generated digest data
├── docs/
│   ├── plans/                  # Design & implementation plans
│   └── README.md               # This file
├── scripts/
│   ├── __tests__/
│   │   └── fetch-feeds.test.ts # Unit tests
│   ├── fetch-feeds.ts          # RSS feed fetcher
│   ├── generate-digest.ts      # Pipeline orchestrator
│   ├── prune-old-digests.ts    # 30-day retention cleanup
│   ├── send-email.ts           # Resend email sender
│   ├── summarize.ts            # Claude API summarizer
│   └── types.ts                # Shared TypeScript types
├── src/
│   ├── app/
│   │   ├── archive/page.tsx    # Archive page (list of past digests)
│   │   ├── digest/[date]/
│   │   │   └── page.tsx        # Daily digest page
│   │   ├── globals.css         # Tailwind v4 + theme variables
│   │   ├── layout.tsx          # Root layout with theme support
│   │   └── page.tsx            # Home (redirects to latest)
│   ├── components/
│   │   └── ThemeToggle.tsx     # Light/dark/system mode toggle
│   └── lib/
│       └── digests.ts          # Data loading utilities
├── sources.yaml                # Configurable RSS feed sources
├── next.config.ts              # Next.js static export config
├── vercel.json                 # Vercel deployment config
├── package.json
└── tsconfig.json
```

---

## Daily Pipeline

### How it runs

The pipeline runs daily via GitHub Actions (`.github/workflows/daily-digest.yml`):

```
Trigger: cron "0 7 * * *" (7:00 AM UTC, every day)

Step 1: npm run generate
  → Reads sources.yaml for RSS feed URLs
  → Fetches all feeds (24-hour window)
  → Sends articles to Claude API for summarization
  → Claude categorizes, scores importance (1-5), writes summaries
  → Saves to content/digests/YYYY-MM-DD.json

Step 2: npm run prune
  → Deletes digest files older than 30 days

Step 3: npm run send-email
  → Reads today's digest
  → Picks top 5 articles by importance
  → Sends HTML email via Resend

Step 4: Git commit & push
  → Commits new digest file to main
  → Push triggers Vercel auto-deploy
```

### Running manually

```bash
# Generate today's digest
npm run generate

# Send today's email
npm run send-email

# Clean up old digests
npm run prune

# Build the site
npm run build
```

---

## Adding/Removing News Sources

Edit `sources.yaml` to add or remove RSS feeds:

```yaml
categories:
  llm_updates:
    name: "LLM Updates"
    feeds:
      - url: "https://openai.com/blog/rss.xml"
        name: "OpenAI Blog"
      # Add new feeds here:
      - url: "https://example.com/feed.xml"
        name: "My New Source"
```

Categories determine how articles are grouped on the site.

---

## Environment Variables

### Local Development (.env.local)

```
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
RESEND_TO_EMAIL=your@email.com
RESEND_FROM_EMAIL=noreply@yourdomain.com
SITE_URL=https://ai-summary-one.vercel.app
```

### GitHub Actions (Repository Secrets)

Set these at: `Settings → Secrets and variables → Actions`

| Secret | Description |
|--------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com |
| `RESEND_API_KEY` | Resend API key from resend.com |
| `RESEND_TO_EMAIL` | Recipient email address |
| `RESEND_FROM_EMAIL` | Sender email (must be verified in Resend) |
| `SITE_URL` | Your Vercel deployment URL |

---

## Theme System

The site supports **light mode**, **dark mode**, and **system** (follows OS preference).

- Theme toggle is in the header (sun/moon/monitor icon)
- Preference is saved to `localStorage`
- FOUC (flash of unstyled content) is prevented with an inline script
- Colors use CSS custom properties defined in `globals.css`

---

## Deployment

### Vercel

The site auto-deploys to Vercel on every push to `main`:
- **URL**: https://ai-summary-one.vercel.app
- **Framework**: Static (null — not using Vercel's Next.js adapter)
- **Build**: `npm run build`
- **Output**: `out/` directory

### GitHub Pages (Alternative)

The static `out/` directory can also be deployed to GitHub Pages or any static host.

---

## Git Workflow

Simple feature-branch workflow:

```
main              ← production (auto-deploys to Vercel)
  └── feature/*   ← new features (branch from main, PR back to main)
```

### Making changes

```bash
# Start from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: description of changes"

# Push and create PR to main
git push -u origin feature/my-feature
# Create PR on GitHub: feature/my-feature → main
# Merging the PR triggers Vercel auto-deploy
```

### Commit message format

Use conventional commits:

```
feat: add dark mode toggle
fix: handle empty RSS feeds gracefully
docs: update deployment instructions
chore: update dependencies
```

---

## Troubleshooting

### "No digests yet" on the site
The daily pipeline hasn't run yet. Run `npm run generate` manually.

### RSS feed returns 403
Some sites (e.g., Reddit) block bot User-Agents. The feed is skipped gracefully.

### Claude API returns markdown-wrapped JSON
The summarizer automatically strips ` ```json ``` ` fences from Claude's response.

### Email not sending
Check that `RESEND_API_KEY` and `RESEND_TO_EMAIL` are set. The sender domain must be verified in Resend.

### Build fails on Vercel
Ensure `vercel.json` has `"framework": null` (not `"nextjs"`) since we use static export.
