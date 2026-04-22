import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const testPassword = "Test1234!";
  const passwordHash = await hashPassword(testPassword);

  const managerEmail = "manager@pos.hssabaty.com";
  const cashierEmail = "cashier@pos.hssabaty.com";

  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: {
      name: "Test Manager",
      role: "MANAGER",
      status: "ACTIVE",
      passwordHash,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      ownerManagerId: null,
    },
    create: {
      email: managerEmail,
      name: "Test Manager",
      role: "MANAGER",
      status: "ACTIVE",
      passwordHash,
    },
    select: { id: true, email: true, role: true },
  });

  await prisma.subscription.upsert({
    where: { managerId: manager.id },
    update: { status: "ACTIVE", endedAt: null },
    create: { managerId: manager.id, status: "ACTIVE" },
    select: { id: true },
  });

  const cashier = await prisma.user.upsert({
    where: { email: cashierEmail },
    update: {
      name: "Test Cashier",
      role: "CASHIER",
      status: "ACTIVE",
      passwordHash,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      ownerManagerId: manager.id,
    },
    create: {
      email: cashierEmail,
      name: "Test Cashier",
      role: "CASHIER",
      status: "ACTIVE",
      passwordHash,
      ownerManagerId: manager.id,
    },
    select: { id: true, email: true, role: true, ownerManagerId: true },
  });

  console.log("Seeded test users:");
  console.log(`- Manager: ${manager.email} (role=${manager.role}) password=${testPassword}`);
  console.log(
    `- Staff/Cashier: ${cashier.email} (role=${cashier.role}, ownerManagerId=${cashier.ownerManagerId}) password=${testPassword}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
