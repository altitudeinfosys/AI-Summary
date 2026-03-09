import { notFound } from "next/navigation";
import { format, parse } from "date-fns";
import { getDigest, getAllDigestDates } from "@/lib/digests";

// Required for output: "export" to allow empty generateStaticParams
export const revalidate = 0;

export async function generateStaticParams() {
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
