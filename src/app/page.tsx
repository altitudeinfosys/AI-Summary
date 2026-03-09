import { redirect } from "next/navigation";
import { getLatestDigestDate } from "@/lib/digests";

export default function Home() {
  const latest = getLatestDigestDate();
  if (latest) {
    redirect(`/digest/${latest}`);
  }

  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold">No digests yet</h1>
      <p className="mt-4 text-gray-500">
        The first digest will appear after the daily pipeline runs.
      </p>
    </div>
  );
}
