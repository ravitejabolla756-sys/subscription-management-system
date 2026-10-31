import "server-only";

import type { User } from "@supabase/supabase-js";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const appRoles = ["admin", "staff", "customer"] as const;
export const appRoleSchema = z.enum(appRoles);
export type AppRole = z.infer<typeof appRoleSchema>;

export class AuthorizationError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type AuthenticatedContext = {
  user: User;
  role: AppRole;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  const role = appRoleSchema.safeParse(profile.role);
  if (!role.success) {
    return null;
  }

  return { user, role: role.data, supabase };
}

export async function requireAuthenticatedContext() {
  const context = await getAuthenticatedContext();

  if (!context) {
    throw new AuthorizationError(
      "UNAUTHENTICATED",
      401,
      "Authentication is required",
    );
  }

  return context;
}

export async function requireRole(allowedRoles: readonly AppRole[]) {
  const context = await requireAuthenticatedContext();

  if (!allowedRoles.includes(context.role)) {
    throw new AuthorizationError(
      "FORBIDDEN",
      403,
      "You do not have permission to perform this action",
    );
  }

  return context;
}
