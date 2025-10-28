import "./globals.css";
import AuthSessionProvider from "@/components/auth/SessionProvider";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { intro, introHead } from "./fonts";

export const metadata = { title: "Devocional Maná — 21 Retos" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="es" className={`${intro.variable} ${introHead.variable}`}>
      <body className="font-sans bg-mana-surface text-mana-ink antialiased">
        <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
