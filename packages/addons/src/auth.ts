import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createActorContext, defineModel, PolicyError, ValidationError } from "@moonwitness/orm";
import type { AddonDefinition } from "@moonwitness/addon-runtime";

const INTERNAL_AUTH_ACTOR = createActorContext("system-auth", "system", undefined, "default", {
  role: "admin",
  groups: ["base.group_system", "base.group_user"],
});

export const SESSION_COOKIE_NAME = "mw_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hexHash] = parts;
  if (!salt || !hexHash) return false;
  const derived = scryptSync(password, salt, 32);
  const target = Buffer.from(hexHash, "hex");
  return derived.length === target.length && timingSafeEqual(derived, target);
}

export const AuthUserModel = defineModel({
  name: "auth.user",
  table: "auth_users",
  originAddon: "auth",
  restEnabled: true,
  recName: "username",
  schema: z.object({
    username: z.string().min(2),
    email: z.string().email(),
    password_hash: z.string().min(1),
    role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
    display_name: z.string().default(""),
    is_active: z.boolean().default(true),
  }),
  fieldPolicies: {
    password_hash: { readRoles: [], writeRoles: ["admin"], sensitive: true },
  },
  indexes: [
    { fields: ["username"], unique: true },
    { fields: ["email"], unique: true },
  ],
});

export const AuthSessionModel = defineModel({
  name: "auth.session",
  table: "auth_sessions",
  originAddon: "auth",
  restEnabled: false,
  recName: "token",
  schema: z.object({
    user_id: z.string().min(1),
    token: z.string().min(16),
    expires_at: z.string(),
  }),
  relations: {
    user_id: { model: "auth.user", type: "many2one", onDelete: "cascade" },
  },
  indexes: [{ fields: ["token"], unique: true }],
});

export const ResRoleModel = defineModel({
  name: "res.role",
  table: "res_roles",
  originAddon: "auth",
  restEnabled: true,
  recName: "name",
  schema: z.object({
    code: z.enum(["admin", "editor", "viewer", "public"]),
    name: z.string().min(1),
    group_xml_ids: z.string().default(""),
    description: z.string().default(""),
  }),
  indexes: [{ fields: ["code"], unique: true }],
});

export const ResPermissionModel = defineModel({
  name: "res.permission",
  table: "res_permissions",
  originAddon: "auth",
  restEnabled: true,
  recName: "scope",
  schema: z.object({
    scope: z.string().min(1),
    model_name: z.string().min(1),
    role_code: z.enum(["admin", "editor", "viewer", "public"]).default("viewer"),
    can_read: z.boolean().default(true),
    can_create: z.boolean().default(false),
    can_update: z.boolean().default(false),
    can_delete: z.boolean().default(false),
  }),
  indexes: [{ fields: ["scope"], unique: true }],
});

export async function createUser(input: {
  username: string;
  email: string;
  password: string;
  role?: "admin" | "editor" | "viewer";
  displayName?: string;
}) {
  return AuthUserModel.repository.create(
    {
      username: input.username.trim().toLowerCase(),
      email: input.email.trim().toLowerCase(),
      password_hash: hashPassword(input.password),
      role: input.role ?? "viewer",
      display_name: input.displayName?.trim() || input.username.trim(),
      is_active: true,
    },
    INTERNAL_AUTH_ACTOR,
  );
}

export async function createSessionRecord(
  userId: string,
): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await AuthSessionModel.repository.create({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });
  return { token, expiresAt };
}

export async function createSession(userId: string): Promise<string> {
  const { token } = await createSessionRecord(userId);
  return token;
}

export async function ensureAuthSchema(): Promise<void> {
  const { syncModels } = await import("@moonwitness/orm");
  await syncModels([AuthUserModel, AuthSessionModel, ResRoleModel, ResPermissionModel]);
}

export function getSessionCookieOptions(secure = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    sameSite: (secure ? "none" : "lax") as "none" | "lax",
    secure,
  };
}

export async function resolveAuthIdentityFromRequest(request: {
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}): Promise<{
  user: {
    id: string;
    username: string;
    email: string;
    role: "admin" | "editor" | "viewer";
    displayName: string;
    groups?: string[];
  } | null;
  expiredSessionCookie: boolean;
}> {
  let token = request.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    const rawCookie = request.headers?.cookie;
    const cookieHeader = Array.isArray(rawCookie) ? rawCookie.join("; ") : rawCookie;
    if (cookieHeader) {
      for (const part of cookieHeader.split(";")) {
        const idx = part.indexOf("=");
        if (idx <= 0) continue;
        if (part.slice(0, idx).trim() === SESSION_COOKIE_NAME) {
          token = decodeURIComponent(part.slice(idx + 1).trim());
          break;
        }
      }
    }
  }
  if (!token) return { user: null, expiredSessionCookie: false };
  const resolved = await resolveSessionByToken(token);
  if (!resolved) return { user: null, expiredSessionCookie: true };
  const groups =
    resolved.role === "admin"
      ? ["base.group_system", "base.group_user"]
      : resolved.role === "editor"
        ? ["base.group_editor", "base.group_user"]
        : ["base.group_user"];
  return {
    user: {
      id: resolved.id,
      username: resolved.username,
      email: resolved.email,
      role: resolved.role,
      displayName: resolved.display_name,
      groups,
    },
    expiredSessionCookie: false,
  };
}

export async function hasClaimedAdmin(): Promise<boolean> {
  const admins = await AuthUserModel.repository.find({ role: "admin", is_active: true }, { limit: 1 });
  return admins.length > 0;
}

/**
 * Atomic first-run admin bootstrap: creates the initial Sovereign Admin account with
 * a user-chosen password (hashed via scrypt). Locks itself permanently once an admin exists
 * or whenever `MW_ADMIN_PASSCODE` is configured in environment variables.
 */
export async function claimInitialAdmin(input: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}) {
  if (process.env.MW_ADMIN_PASSCODE?.trim()) {
    throw new PolicyError(
      "Admin passcode is managed via server environment configuration.",
      "BOOTSTRAP_LOCKED",
      409,
    );
  }
  if (await hasClaimedAdmin()) {
    throw new PolicyError(
      "Initial admin account has already been claimed.",
      "BOOTSTRAP_LOCKED",
      409,
    );
  }
  if (!input.password || input.password.length < 8) {
    throw new ValidationError("Admin passphrase must be at least 8 characters.");
  }
  return createUser({
    username: input.username,
    email: input.email,
    password: input.password,
    role: "admin",
    displayName: input.displayName || "Sovereign Admin",
  });
}

export async function authenticateWithPassword(
  identity: string,
  password: string,
): Promise<{
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: "admin" | "editor" | "viewer";
} | null> {
  const normalized = identity.trim().toLowerCase();
  if (!normalized || !password) return null;

  // Support server-configured MW_ADMIN_PASSCODE override for admin identity
  const envPasscode = process.env.MW_ADMIN_PASSCODE?.trim();
  if (
    envPasscode &&
    (normalized === "admin" || normalized === "admin@moonwitness.local") &&
    password.length === envPasscode.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(envPasscode))
  ) {
    const existingAdmin = (await AuthUserModel.repository.find({ role: "admin" }, { limit: 1 }))[0];
    if (existingAdmin) {
      return {
        id: existingAdmin.id,
        username: String(existingAdmin.username),
        email: String(existingAdmin.email),
        display_name: String(existingAdmin.display_name || existingAdmin.username),
        role: "admin",
      };
    }
    const created = await createUser({
      username: "admin",
      email: "admin@moonwitness.local",
      password: envPasscode,
      role: "admin",
      displayName: "Sovereign Admin",
    });
    return {
      id: created.id,
      username: String(created.username),
      email: String(created.email),
      display_name: String(created.display_name || created.username),
      role: "admin",
    };
  }

  // Unscoped internal lookup so password_hash is readable for server-side scrypt verification
  const byEmail = await AuthUserModel.repository.find({ email: normalized }, { limit: 1 });
  const byUsername =
    byEmail.length > 0
      ? byEmail
      : await AuthUserModel.repository.find({ username: normalized }, { limit: 1 });
  const user = byUsername[0];
  if (!user || !user.is_active) return null;
  if (!verifyPassword(password, String(user.password_hash ?? ""))) return null;

  return {
    id: user.id,
    username: String(user.username),
    email: String(user.email),
    display_name: String(user.display_name || user.username),
    role: user.role as "admin" | "editor" | "viewer",
  };
}

export async function resolveSessionByToken(token: string): Promise<{
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: "admin" | "editor" | "viewer";
} | null> {
  if (!token || token.length < 16) return null;
  const sessions = await AuthSessionModel.repository.find({ token }, { limit: 1 });
  const session = sessions[0];
  if (!session) return null;

  const expiresAt = Date.parse(String(session.expires_at ?? ""));
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    await AuthSessionModel.repository.delete(session.id);
    return null;
  }

  const user = await AuthUserModel.repository.findOne(String(session.user_id));
  if (!user || !user.is_active) return null;

  return {
    id: user.id,
    username: String(user.username),
    email: String(user.email),
    display_name: String(user.display_name || user.username),
    role: user.role as "admin" | "editor" | "viewer",
  };
}

export async function revokeSessionByToken(token: string): Promise<boolean> {
  if (!token) return false;
  const sessions = await AuthSessionModel.repository.find({ token }, { limit: 1 });
  const session = sessions[0];
  if (!session) return false;
  await AuthSessionModel.repository.delete(session.id);
  return true;
}

export function createAuthAddon(): AddonDefinition {
  return {
    manifest: {
      name: "auth",
      version: "1.0.0",
      description: "Identity, session management, RBAC role directory, and ACL rule registry.",
      category: "Security",
      depends: ["__base"],
      provides: {
        models: ["auth.user", "auth.session", "res.role", "res.permission"],
        routes: ["auth"],
      },
      defaultEnabled: true,
    },
    models: [AuthUserModel, AuthSessionModel, ResRoleModel, ResPermissionModel],
    views: [
      {
        id: "auth.user.list",
        model: "auth.user",
        view_type: "list",
        spec: {
          title: "Platform Operators",
          description: "Registered MoonWitness operators and assigned access roles.",
          columns: ["username", "display_name", "email", "role", "is_active"],
        },
      },
      {
        id: "res.role.list",
        model: "res.role",
        view_type: "list",
        spec: {
          title: "Role Directory",
          description: "Canonical RBAC role definitions and bound security groups.",
          columns: ["code", "name", "group_xml_ids", "description"],
        },
      },
      {
        id: "res.permission.list",
        model: "res.permission",
        view_type: "list",
        spec: {
          title: "ACL Permission Matrix",
          description: "Model-level CRUD capabilities enforced by SecurityRegistry.",
          columns: ["scope", "model_name", "role_code", "can_read", "can_create", "can_update", "can_delete"],
        },
      },
    ],
    menus: [
      {
        menu_key: "auth.users",
        label: "Operators",
        href: "/addons?model=auth.user",
        icon: "users",
        plane: "operations",
        sort_order: 80,
        min_role: "admin",
      },
      {
        menu_key: "auth.roles",
        label: "RBAC Roles",
        href: "/addons?model=res.role",
        icon: "shield",
        plane: "operations",
        sort_order: 81,
        min_role: "admin",
      },
      {
        menu_key: "auth.permissions",
        label: "ACL Rules",
        href: "/addons?model=res.permission",
        icon: "lock",
        plane: "operations",
        sort_order: 82,
        min_role: "admin",
      },
    ],
    acl: [
      { model: "auth.user", role: "viewer", canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      { model: "auth.user", role: "editor", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      { model: "res.role", role: "viewer", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      { model: "res.role", role: "editor", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      { model: "res.permission", role: "viewer", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      { model: "res.permission", role: "editor", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    ],
    seed: async () => {
      if ((await ResRoleModel.repository.count()) === 0) {
        await ResRoleModel.repository.upsert(
          { code: "admin" },
          {
            code: "admin",
            name: "Sovereign Admin",
            group_xml_ids: "base.group_system, base.group_user",
            description: "Full addon lifecycle, Studio schema/view editing, RBAC, and audit access.",
          },
        );
        await ResRoleModel.repository.upsert(
          { code: "editor" },
          {
            code: "editor",
            name: "Chronicle & CAB Editor",
            group_xml_ids: "base.group_editor, base.group_user",
            description: "Create, update, and approve CAB changes, timeline dispatches, and claims.",
          },
        );
        await ResRoleModel.repository.upsert(
          { code: "viewer" },
          {
            code: "viewer",
            name: "Witness Viewer",
            group_xml_ids: "base.group_user",
            description: "Authenticated read-only access and chatter commentary across workspaces.",
          },
        );
      }

      if ((await ResPermissionModel.repository.count()) === 0) {
        const defaults = [
          { scope: "cab.change:editor", model_name: "cab.change", role_code: "editor", can_read: true, can_create: true, can_update: true, can_delete: false },
          { scope: "timeline.event:editor", model_name: "timeline.event", role_code: "editor", can_read: true, can_create: true, can_update: true, can_delete: false },
          { scope: "canon.codex:viewer", model_name: "canon.codex", role_code: "viewer", can_read: true, can_create: false, can_update: false, can_delete: false },
          { scope: "auth.user:admin", model_name: "auth.user", role_code: "admin", can_read: true, can_create: true, can_update: true, can_delete: true },
          { scope: "mail.message:viewer", model_name: "mail.message", role_code: "viewer", can_read: true, can_create: true, can_update: false, can_delete: false },
          { scope: "snmp.target:admin", model_name: "snmp.target", role_code: "admin", can_read: true, can_create: true, can_update: true, can_delete: true },
        ] as const;
        for (const item of defaults) {
          await ResPermissionModel.repository.upsert({ scope: item.scope }, item);
        }
      }
    },
  };
}
