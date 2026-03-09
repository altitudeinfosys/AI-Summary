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
