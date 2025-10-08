import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { getUserState, setUserState } from "@/lib/server/state-store";
import { emptyUserState, type UserState } from "@/lib/user-state";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(emptyUserState(), { status: 200 });
  }
  const state = await getUserState(session.user.email);
  return NextResponse.json(state, { status: 200 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }
  const body = (await request.json()) as Partial<UserState>;
  const current = await getUserState(session.user.email);
  const nextState: UserState = {
    ...current,
    ...body,
  };
  await setUserState(session.user.email, nextState);
  return NextResponse.json({ ok: true }, { status: 200 });
}
