import "dotenv/config";
import { PrismaClient, type Role } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth";

// Institutional accounts are provisioned, not self-registered — run:
//   npm run db:create-admin -- you@example.com "a strong password" "Optional Name" [ROLE] [districtId]
// ROLE is ADMIN (default), REVIEWER, or DISTRICT_OFFICER. districtId is
// required for DISTRICT_OFFICER (see lib/districts.ts for valid ids, e.g.
// western_urban) and ignored otherwise.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — see README Quick start.");
}
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const VALID_ROLES: Role[] = ["ADMIN", "REVIEWER", "DISTRICT_OFFICER"];

function usage(): never {
  console.error(
    'Usage: npm run db:create-admin -- you@example.com "a strong password" "Optional Name" [ROLE] [districtId]',
  );
  process.exit(1);
}

async function main() {
  const [email, password, name, roleArg, districtId] = process.argv.slice(2);
  if (!email || !password) usage();
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }

  const role = (roleArg?.toUpperCase() as Role | undefined) ?? "ADMIN";
  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role "${roleArg}" — must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }
  if (role === "DISTRICT_OFFICER" && !districtId) {
    console.error("DISTRICT_OFFICER requires a districtId argument.");
    process.exit(1);
  }
  if (districtId) {
    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) {
      console.error(`Unknown districtId "${districtId}".`);
      process.exit(1);
    }
  }

  const passwordHash = hashPassword(password);
  const data = {
    passwordHash,
    name: name ?? undefined,
    role,
    districtId: role === "DISTRICT_OFFICER" ? districtId : null,
  };
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: data,
    create: { email: email.toLowerCase(), ...data },
  });
  console.log(`Account ready: ${user.email} (${user.role}${user.districtId ? `, ${user.districtId}` : ""})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
