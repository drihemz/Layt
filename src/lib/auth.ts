import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const { data: user, error } = await supabase
            .from("users")
            .select("*, tenants(*)")
            .eq("email", credentials.email)
            .eq("is_active", true)
            .single();

          if (error || !user) {
            return null;
          }

          if (!user.password_hash) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isValid) {
            return null;
          }

          const payload = {
            aud: "authenticated",
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenant_id, // top-level claim used by RLS policies
            app_metadata: {
              provider: "credentials",
              tenantId: user.tenant_id,
            },
          };

          const token = jwt.sign(payload, process.env.SUPABASE_JWT_SECRET!);

          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role,
            tenantId: user.tenant_id,
            tenant: user.tenants,
            supabaseAccessToken: token,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenant = user.tenant;
        token.supabaseAccessToken = (user as any).supabaseAccessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenant = token.tenant as any;
        session.supabaseAccessToken = token.supabaseAccessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

