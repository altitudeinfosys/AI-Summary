import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { format } from "date-fns";
import { Resend } from "resend";
import type { DailyDigest } from "./types";

// Load .env.local for local development (override existing empty vars)
config({ path: path.join(process.cwd(), ".env.local"), override: true });

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
