import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string | null;
      role?: string | null;
    };
    pv?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string | null;
    pv?: number | null;
  }
}

export {};
