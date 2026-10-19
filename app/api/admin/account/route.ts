import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, setAdminSession } from "@/lib/auth";

const schema = z.object({ name: z.string().trim().min(2).max(80), currentPassword: z.string().min(1).max(72), newPassword: z.string().min(12).max(72).optional() });
export async function GET() {
  const auth = await requireAdmin(); if (!auth.session) return auth.response!;
  try {
    const account = await prisma.admin.findUnique({ where: { id: auth.session.id }, select: { name: true, email: true } });
    if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    return NextResponse.json({ account });
  } catch { return NextResponse.json({ error: "Could not load your account." }, { status: 500 }); }
}
export async function PUT(req: Request) {
  const auth = await requireAdmin(); if (!auth.session) return auth.response!;
  try {
    const body = schema.parse(await req.json());
    if (body.newPassword && Buffer.byteLength(body.newPassword, "utf8") > 72) return NextResponse.json({ error: "New password must be at most 72 UTF-8 bytes." }, { status: 400 });
    const previous = await prisma.admin.findUnique({ where: { id: auth.session.id } });
    if (!previous || !await bcrypt.compare(body.currentPassword, previous.passwordHash)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    if (body.newPassword && await bcrypt.compare(body.newPassword, previous.passwordHash)) return NextResponse.json({ error: "Choose a different new password." }, { status: 400 });
    const account = await prisma.admin.update({ where: { id: previous.id }, data: { name: body.name, ...(body.newPassword ? { passwordHash: await bcrypt.hash(body.newPassword, 12) } : {}) } });
    await setAdminSession({ id: account.id, email: account.email });
    return NextResponse.json({ account: { name: account.name, email: account.email } });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? "Enter your name, current password, and a new password of 12–72 characters if changing it." : "Could not update your account." }, { status: 400 }); }
}
