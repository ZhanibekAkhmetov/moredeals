import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: "../../.env", quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const passwordHash = await hash("admin", 12);

  await prisma.user.upsert({
    where: { email: "admin@moredeals.local" },
    create: {
      name: "Admin",
      email: "admin@moredeals.local",
      passwordHash,
      role: UserRole.ADMIN,
    },
    update: {
      name: "Admin",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  console.log("Seeded admin user only: admin@moredeals.local");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
