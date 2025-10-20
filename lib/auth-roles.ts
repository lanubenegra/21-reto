import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import authOptions from "@/auth.config";

type AdminRole = "support" | "admin" | "superadmin";

export async function requireSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Response("unauthorized", { status: 401 });
  }
  return session;
}

export function assertRole(session: Session, allowed: AdminRole[]) {
  const role = session.user?.role ?? "user";
  if (!allowed.includes(role)) {
    throw new Response("forbidden", { status: 403 });
  }
}
