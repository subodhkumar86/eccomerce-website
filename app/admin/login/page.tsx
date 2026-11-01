import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import AdminLogin from "@/components/admin-login";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin login | Veloura", robots: { index: false, follow: false } };

export default async function LoginPage() {
  let credentials: { email: string; password: string } | undefined;
  const showcase = process.env.ADMIN_SHOWCASE_LOGIN === "true";
  const host = (await headers()).get("host") ?? "";
  const localDevelopment = process.env.NODE_ENV === "development" && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
  if (showcase || localDevelopment) {
      const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const password = process.env.ADMIN_PASSWORD;
      if (email && password) {
        const account = await prisma.admin.findUnique({ where: { email } }).catch(() => null);
        if (account && await bcrypt.compare(password, account.passwordHash)) credentials = { email, password };
      }
  }
  return <AdminLogin credentials={credentials} showcase={showcase} />;
}
