import "dotenv/config";
import { runIngestion } from "@/lib/ingest";

runIngestion()
  .then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
