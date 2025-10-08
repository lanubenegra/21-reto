import "./globals.css";
import { Montserrat, Source_Sans_3 } from "next/font/google";
import AuthSessionProvider from "@/components/auth/SessionProvider";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";

const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-body" });
const head = Montserrat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-head" });

export const metadata = { title: "Devocional Maná — 21 Retos" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="es" className={`${body.variable} ${head.variable}`}>
      <body className="font-sans bg-mana-surface text-mana-ink antialiased">
        <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
