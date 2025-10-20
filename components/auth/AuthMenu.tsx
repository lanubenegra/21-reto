"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { User, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AuthMenu() {
  const { data: session, status } = useSession();
  const role = session?.user?.role ?? "user";
  const isAdmin = ["support", "admin", "superadmin"].includes(role);

  if (status === "loading") {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-white/50" />;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild className="bg-mana-secondary text-white hover:bg-mana-primary">
          <Link href="/auth/signin?mode=login">Iniciar sesión</Link>
        </Button>
        <Button asChild variant="secondary" className="border border-mana-secondary/40 text-mana-primary hover:bg-mana-secondary hover:text-white">
          <Link href="/auth/signin?mode=register">Regístrate</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full bg-white/80 px-3 py-1 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-mana-primary">
        <User className="h-4 w-4" />
        <span className="max-w-[140px] truncate font-medium">{session.user.name ?? session.user.email}</span>
      </div>
      {isAdmin && (
        <Button
          asChild
          variant="secondary"
          className="border-mana-primary/10 bg-mana-primary text-white hover:bg-mana-secondary"
        >
          <Link href="/admin">
            <ShieldCheck className="mr-1 h-4 w-4" />
            Panel
          </Link>
        </Button>
      )}
      <Button variant="secondary" className="bg-mana-primary text-white hover:bg-mana-secondary" onClick={() => signOut()}>
        <LogOut className="mr-1 h-4 w-4" /> Salir
      </Button>
    </div>
  );
}
