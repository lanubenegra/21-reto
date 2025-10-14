import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AzureADProvider from "next-auth/providers/azure-ad";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyUser } from "@/lib/server/user-store";

const providers: AuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  providers.push(
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID,
    })
  );
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    })
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    })
  );
}

providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "Correo y contraseña",
    credentials: {
      email: { label: "Correo", type: "text", placeholder: "tu@email.com" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const user = await verifyUser(credentials.email, credentials.password);
      if (!user) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  })
);

export const authOptions: AuthOptions = {
  providers,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;
