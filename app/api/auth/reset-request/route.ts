import { NextResponse } from "next/server";
import { createResetToken, getUserByEmail } from "@/lib/server/user-store";

interface Body {
  email: string;
}

export async function POST(request: Request) {
  const { email } = (await request.json()) as Partial<Body>;
  if (!email) return NextResponse.json({ message: "Debes indicar un correo." }, { status: 400 });
  const user = await getUserByEmail(email);
  if (!user) {
    // Respondemos éxito igualmente para no revelar información
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  const tokenData = await createResetToken(email);
  if (!tokenData) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  // En un entorno real enviaríamos un correo. De momento lo registramos en logs de servidor.
  console.info(`Token de reseteo para ${email}: ${tokenData.token}`);
  return NextResponse.json({ ok: true }, { status: 200 });
}
