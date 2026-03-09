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
