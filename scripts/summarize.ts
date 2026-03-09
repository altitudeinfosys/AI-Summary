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
