import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Netlify Functions ship a read-only bundle (only /tmp is writable). SQLite
// needs to create -wal/-journal sidecar files even for plain reads, so on
// Netlify we copy the bundled db into /tmp once per cold start and open it
// from there instead of the read-only deploy path.
function resolveDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL ?? "file:./dev.db";
  if (process.env.NETLIFY && configured.startsWith("file:")) {
    const source = path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      configured.slice("file:".length),
    );
    const dest = "/tmp/dev.db";
    if (!fs.existsSync(dest) && fs.existsSync(source)) {
      fs.copyFileSync(source, dest);
    }
    return `file:${dest}`;
  }
  return configured;
}

const adapter = new PrismaBetterSqlite3({
  url: resolveDatabaseUrl(),
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
