import { scrapeQuestions } from "../src/lib/scraper";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Scraping questions...");
  const result = await scrapeQuestions();

  if (result.error) {
    console.error("Scrape error:", result.error);
    process.exit(1);
  }

  console.log(`Got ${result.questions.length} questions`);

  const outPath = path.resolve(__dirname, "..", "public", "data", "questions.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result.questions, null, 2));
  console.log(`Saved to ${outPath}`);
}

main();
