import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth";

// Institutional accounts are provisioned, not self-registered — run:
//   npm run db:create-admin -- you@example.com "a strong password" "Optional Name"
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — see README Quick start.");
}
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run db:create-admin -- you@example.com "a strong password" "Optional Name"');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }

  const passwordHash = hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, name: name ?? undefined },
    create: { email: email.toLowerCase(), passwordHash, name: name ?? undefined },
  });
  console.log(`Admin account ready: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
