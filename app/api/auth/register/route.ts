import { NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/server/user-store";

interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export async function POST(request: Request) {
  const { name, email, password } = (await request.json()) as Partial<RegisterBody>;
  if (!name || !email || !password) {
    return NextResponse.json({ message: "Todos los campos son obligatorios." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ message: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ message: "Ya existe una cuenta con este correo." }, { status: 409 });
  }
  await createUser(name, email, password);
  return NextResponse.json({ ok: true }, { status: 201 });
}
