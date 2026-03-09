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
