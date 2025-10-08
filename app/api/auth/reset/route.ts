import { NextResponse } from "next/server";
import { consumeResetToken, updatePassword } from "@/lib/server/user-store";

interface Body {
  token: string;
  password: string;
}

export async function POST(request: Request) {
  const { token, password } = (await request.json()) as Partial<Body>;
  if (!token || !password) {
    return NextResponse.json({ message: "Datos incompletos" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ message: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  const userId = await consumeResetToken(token);
  if (!userId) {
    return NextResponse.json({ message: "Token inválido o expirado" }, { status: 400 });
  }
  await updatePassword(userId, password);
  return NextResponse.json({ ok: true }, { status: 200 });
}
