import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import prisma from "./db";

const ADMIN_EMAILS = [
  "bharath.tummaganti@cloudfuze.com",
];

const AZURE_SCOPES = "openid profile email User.Read offline_access";

/**
 * Renews Microsoft Graph access using the OAuth refresh token (access tokens expire ~1h).
 */
async function refreshAzureAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
} | null> {
  const tenantId = process.env.AZURE_AD_TENANT_ID?.trim();
  const clientId = process.env.AZURE_AD_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET?.trim();
  if (!tenantId || !clientId || !clientSecret) return null;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: AZURE_SCOPES,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("[auth] Azure token refresh failed:", res.status, t.slice(0, 400));
    return null;
  }

  return res.json() as Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>;
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "",
      authorization: {
        params: {
          scope: AZURE_SCOPES,
        },
      },
    }),
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.active) {
          return null;
        }

        if (!user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "azure-ad") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        let dbUser = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });

        if (!dbUser) {
          const isAdmin = ADMIN_EMAILS.includes(email);
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split("@")[0],
              password: "",
              role: isAdmin ? "ADMIN" : "ENGINEER",
              active: true,
            },
          });
        }

        if (!dbUser.active) {
          return false;
        }

        user.id = dbUser.id;
        (user as { role: string }).role = dbUser.role;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }

      if (account?.provider === "azure-ad") {
        if (account.access_token) token.accessToken = account.access_token;
        if (account.refresh_token) token.refreshToken = account.refresh_token;
        const expSec = account.expires_at;
        token.accessTokenExpires =
          typeof expSec === "number"
            ? expSec * 1000
            : Date.now() + ((account as { expires_in?: number }).expires_in ?? 3600) * 1000;
        delete token.error;
        if (user?.email) {
          const dbUser = await prisma.user.findFirst({
            where: { email: { equals: user.email, mode: "insensitive" } },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        }
      }

      // Renew expired (or soon-to-expire) Graph token for Azure sessions.
      if (token.refreshToken && typeof token.accessTokenExpires === "number") {
        const bufferMs = 60_000;
        if (Date.now() < token.accessTokenExpires - bufferMs) {
          return token;
        }
        const refreshed = await refreshAzureAccessToken(token.refreshToken as string);
        if (refreshed?.access_token) {
          token.accessToken = refreshed.access_token;
          token.accessTokenExpires = Date.now() + (refreshed.expires_in ?? 3600) * 1000;
          if (refreshed.refresh_token) token.refreshToken = refreshed.refresh_token;
          delete token.error;
        } else {
          token.error = "RefreshAccessTokenError";
          token.accessToken = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      (session as { accessToken?: string }).accessToken = token.accessToken as string | undefined;
      if (token.error) {
        (session as { error?: string }).error = token.error as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
