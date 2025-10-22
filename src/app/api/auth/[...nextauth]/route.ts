import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
  }

  interface JWT {
    accessToken?: string;
    refreshToken?: string;
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.send",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Store the access and refresh tokens
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.refreshToken = token.refreshToken as string | undefined;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
