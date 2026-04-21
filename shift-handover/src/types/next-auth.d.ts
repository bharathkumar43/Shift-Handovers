import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    accessToken?: string;
    /** Set when Azure token refresh fails; user should sign out and sign in again. */
    error?: string;
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    accessToken?: string;
    /** Azure AD refresh token (server-only; used to renew Graph access). */
    refreshToken?: string;
    /** When `accessToken` expires (ms since epoch). */
    accessTokenExpires?: number;
    error?: string;
  }
}
