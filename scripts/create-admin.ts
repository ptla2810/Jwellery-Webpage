/**
 * Create (or promote) an administrator.
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is read from the ADMIN_PASSWORD environment variable, or prompted for interactively.
 * Never commit administrator credentials.
 */
import { PrismaClient } from "@prisma/client";
import { createInterface } from "node:readline";
import { hashPassword, passwordIssue } from "../src/lib/auth/password";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function promptHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WritableStream };
  let prompted = false;
  out._writeToOutput = (s: string) => {
    if (!prompted) {
      out.output.write(s);
      prompted = true;
    }
  };
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); process.stdout.write("\n"); resolve(a); }));
}

export async function createAdmin(prisma: PrismaClient, email: string, name: string, password: string, roleKey = "admin") {
  const issue = passwordIssue(password);
  if (issue) throw new Error(issue);
  const role = await prisma.role.findUnique({ where: { key: roleKey } });
  if (!role) throw new Error(`Role "${roleKey}" not found — run "npm run db:seed" first`);
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name, passwordHash, roleId: role.id, emailVerifiedAt: new Date() },
    update: { roleId: role.id, passwordHash, isActive: true },
  });
}

async function main() {
  const email = arg("email");
  const name = arg("name") ?? "Administrator";
  const role = arg("role") ?? "admin";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npm run admin:create -- --email you@example.com --name "Your Name" [--role admin|staff]');
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD || (await promptHidden("Password (min 8 chars, letters + numbers): "));
  const prisma = new PrismaClient();
  try {
    const user = await createAdmin(prisma, email, name, password, role);
    console.log(`✔ ${user.email} now has the "${role}" role. Sign in at /login, then open /admin.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes("create-admin")) {
  main().catch((e) => {
    console.error("✖", e.message);
    process.exit(1);
  });
}
