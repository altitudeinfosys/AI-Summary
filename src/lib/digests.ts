import fs from "node:fs";
import path from "node:path";
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
