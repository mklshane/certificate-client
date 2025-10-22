"use server";

import { signOut } from "next-auth/react";

export async function clearAuthTokens() {
  // Clear all auth-related storage
  localStorage.removeItem("next-auth.callbackUrl");
  localStorage.removeItem("next-auth.session-token");
  localStorage.removeItem("__Secure-next-auth.session-token");

  // Force sign out
  await signOut({ callbackUrl: "/certificates" });
}
