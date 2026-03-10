import { getAllDigestDates } from "@/lib/digests";
import { format, parse } from "date-fns";

export default function ArchivePage() {
  const dates = getAllDigestDates();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Archive</h1>
      {dates.length === 0 ? (
        <p className="text-secondary">No digests yet.</p>
      ) : (
        <ul className="space-y-2">
          {dates.map((date) => {
            const formatted = format(
              parse(date, "yyyy-MM-dd", new Date()),
              "EEEE, MMMM d, yyyy"
            );
            return (
              <li key={date}>
                <a
                  href={`/digest/${date}`}
                  className="text-link hover:text-link-hover hover:underline"
                >
                  {formatted}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
