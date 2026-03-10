import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { format } from "date-fns";
import { loadSources, fetchAllFeeds } from "./fetch-feeds";
import { summarizeArticles } from "./summarize";
import type { DailyDigest } from "./types";

// Load .env.local for local development (override existing empty vars)
config({ path: path.join(process.cwd(), ".env.local"), override: true });

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
