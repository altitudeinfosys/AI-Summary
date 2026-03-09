import * as fs from "fs";
import * as path from "path";
import { subDays, parse, isValid } from "date-fns";

const RETENTION_DAYS = 30;

function main() {
  const digestDir = path.join(process.cwd(), "content", "digests");
  const cutoff = subDays(new Date(), RETENTION_DAYS);

  if (!fs.existsSync(digestDir)) {
    console.log("No digest directory found.");
    return;
  }

  const files = fs.readdirSync(digestDir).filter((f) => f.endsWith(".json"));
  let pruned = 0;

  for (const file of files) {
    const dateStr = file.replace(".json", "");
    const date = parse(dateStr, "yyyy-MM-dd", new Date());

    if (isValid(date) && date < cutoff) {
      fs.unlinkSync(path.join(digestDir, file));
      console.log(`Pruned: ${file}`);
      pruned++;
    }
  }

  console.log(`Pruned ${pruned} old digests (keeping last ${RETENTION_DAYS} days).`);
}

main();
