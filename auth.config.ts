import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseAnon } from "@/lib/supabase-anon";
import { getAuthUserWithProfileByEmail } from "@/lib/server/user-store";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { rateLimit } from "@/lib/server/rate-limit";
import { getClientIp } from "@/lib/server/request";

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
      tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
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
      email: { label: "Correo", type: "email", placeholder: "tu@email.com" },
      password: { label: "Contraseña", type: "password" },
      cfToken: { label: "Turnstile", type: "text" },
    },
    async authorize(credentials, req) {
      const email = credentials?.email?.trim().toLowerCase() ?? "";
      const password = credentials?.password ?? "";
      if (!email || !password) return null;

      const captchaOk = await verifyTurnstile(credentials?.cfToken);
      if (!captchaOk) {
        console.warn("[auth] turnstile failed", { email });
        throw new Error("captcha_failed");
      }

      const ip =
        (req?.headers?.get && getClientIp({ headers: req.headers })) ||
        "unknown";
      if (!rateLimit(`login:${ip}:${email}`, 10, 60_000)) {
        throw new Error("rate_limited");
      }

      try {
        const existing = await getAuthUserWithProfileByEmail(email);
        const user = existing?.auth;
        if (!user?.id) return null;
        if (!user.email_confirmed_at) {
          throw new Error("email_not_confirmed");
        }

        const { data: credential } = await supabaseAdmin
          .from("user_credentials")
          .select("password_hash,password_version")
          .eq("user_id", user.id)
          .maybeSingle();

        if (credential?.password_hash) {
          const matches = await bcrypt.compare(password, credential.password_hash);
          if (matches) {
            return { id: user.id, email };
          }
        }

        const anon = supabaseAnon();
        const { data: authData, error: authError } = await anon.auth.signInWithPassword({
          email,
          password,
        });

        if (authError || !authData?.user) return null;

        const supabaseUser = authData.user;
        const confirmedAt = supabaseUser.email_confirmed_at ?? supabaseUser.confirmed_at;
        if (!confirmedAt) {
          throw new Error("email_not_confirmed");
        }

        const supabaseId = supabaseUser.id;
        const newHash = await bcrypt.hash(password, 12);
        const nextVersion = (credential?.password_version ?? 0) + 1;

        await supabaseAdmin
          .from("user_credentials")
          .upsert({
            user_id: supabaseId,
            password_hash: newHash,
            password_version: nextVersion,
            updated_at: new Date().toISOString(),
          })
          .throwOnError();

        return { id: supabaseId, email };
      } catch (error) {
        console.error("[auth] credentials authorize failed", error);
        return null;
      }
    },
  })
);

export const authOptions: AuthOptions = {
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== "credentials" && user?.email) {
        try {
          const existing = await getAuthUserWithProfileByEmail(user.email.toLowerCase());
          const supabaseUser = existing?.auth;
          if (!supabaseUser?.email_confirmed_at) return false;
        } catch (error) {
          console.error("[auth] signIn verification failed", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        try {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          token.role = profile?.role ?? "user";
        } catch (error) {
          console.error("[auth] jwt profile load failed", error);
          token.role = "user";
        }

        try {
          const { data: credential } = await supabaseAdmin
            .from("user_credentials")
            .select("password_version")
            .eq("user_id", user.id)
            .maybeSingle();
          token.pv = credential?.password_version ?? 0;
        } catch (error) {
          console.error("[auth] jwt credential load failed", error);
          token.pv = 0;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.role = token.role ?? "user";
      }
      session.pv = token.pv ?? 0;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;
