import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import authOptions from "@/auth.config";
import { emptyUserState, type UserState } from "@/lib/user-state";
import { getUserState, setUserState } from "@/lib/server/state-store";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  return {
    id: session.user.id as string,
    email: session.user.email ?? undefined,
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const state = await getUserState(auth.id, auth.email);
  return NextResponse.json(state);
}

async function writeState(req: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<UserState>;
  const state: UserState = { ...emptyUserState(), ...body };

  await setUserState(auth.id, auth.email, state);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  return writeState(req);
}

export async function POST(req: Request) {
  return writeState(req);
}
