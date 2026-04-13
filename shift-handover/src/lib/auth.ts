import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import prisma from "./db";

const ADMIN_EMAILS = [
  "bharath.tummaganti@cloudfuze.com",
];

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "",
      authorization: {
        params: {
          scope: "openid profile email User.Read",
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

      if (account?.provider === "azure-ad" && user?.email) {
        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" } },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
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
