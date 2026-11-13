import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { del } from "@vercel/blob";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { getFirebaseAdmin, type AdminFirebaseUser } from "./firebase.server";

const firebaseToken = z.string().min(1).max(8192);
const targetId = z.string().regex(/^[A-Za-z0-9_-]{1,150}$/);
const roleSchema = z.enum(["user", "creator", "company"]);
const reportReasonSchema = z.enum(["offensive", "discrimination", "spam", "other"]);
const userSearchSchema = z.object({
  firebaseToken,
  query: z.string().trim().max(100).default(""),
  pageToken: z.string().max(4096).optional(),
});

type FirebaseIdentity = { uid: string; email: string };
type AdminContext = FirebaseIdentity & { adminId: string };
type FirebaseUser = AdminFirebaseUser;

const reviewTerms = [
  "hijo de puta",
  "puta",
  "puto",
  "maricón",
  "maricon",
  "negro de mierda",
  "mátate",
  "matate",
  "estafa",
  "spam",
];
const reviewPattern = new RegExp(
  `\\b(?:${reviewTerms.map(escapeRegex).join("|")})\\b`,
  "i",
);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isReviewFlagged(text: string): boolean {
  return reviewPattern.test(text);
}

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function requireAdmin(
  bearerToken: string | undefined,
  firebaseIdToken: string,
): Promise<AdminContext> {
  const session = await requireAllowlistedSession(bearerToken);
  const sessionEmail = session?.email?.trim().toLowerCase();
  const { auth } = getFirebaseAdmin();
  const identity = await auth.verifyIdToken(firebaseIdToken, true);
  const firebaseEmail = identity.email?.trim().toLowerCase();
  if (
    !identity.uid ||
    !firebaseEmail ||
    identity.email_verified !== true ||
    firebaseEmail !== sessionEmail ||
    !adminEmails().has(firebaseEmail)
  ) {
    throw new Error("ADMIN_NOT_FOUND");
  }
  return { uid: identity.uid, email: firebaseEmail, adminId: session.id };
}

async function requireAllowlistedSession(bearerToken: string | undefined) {
  const session = await getSessionUser(bearerToken);
  const email = session?.email?.trim().toLowerCase();
  if (!session || !email || !adminEmails().has(email)) {
    throw new Error("ADMIN_NOT_FOUND");
  }
  return session;
}

async function requireFirebaseUser(idToken: string): Promise<FirebaseIdentity> {
  const { auth, db } = getFirebaseAdmin();
  const identity = await auth.verifyIdToken(idToken, true);
  const email = identity.email?.trim().toLowerCase();
  if (!identity.uid || !email || identity.email_verified !== true) {
    throw new Error("Sesión no válida. Inicia sesión de nuevo.");
  }
  const status = await db.collection("user_status").doc(identity.uid).get();
  if (status.get("blocked") === true) {
    throw new Error("Esta cuenta está bloqueada y no puede realizar esta acción.");
  }
  return { uid: identity.uid, email };
}

async function writeAudit(admin: AdminContext, action: string, targetType: string, id: string) {
  const sql = await getSql();
  await sql`
    insert into admin_audit_log (id, admin_id, action, target_type, target_id)
    values (${randomUUID()}, ${admin.adminId}, ${action}, ${targetType}, ${id})
  `;
}

function dateMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }
  return 0;
}

function appRole(profileData: Record<string, unknown> | undefined): string {
  const role = profileData?.role;
  if (role === "creator") return "creator";
  if (role === "company" || role === "business") return "company";
  if (profileData?.creatorMode === true) return "creator";
  return "user";
}

async function loadAllUsers() {
  const { auth, db } = getFirebaseAdmin();
  const users: FirebaseUser[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  const profileSnapshot = await db.collection("users").get();
  const profiles = new Map(profileSnapshot.docs.map((entry) => [entry.id, entry.data()]));
  return { users, profiles, db };
}

function utcDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ firebaseToken }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.bearerToken, data.firebaseToken);
    const [{ users, profiles, db }, sql] = await Promise.all([
      loadAllUsers(),
      getSql(),
    ]);
    const storedRoles = await sql<{ user_id: string; role: string }>`
      select user_id, role from user_status
    `;
    const roleById = new Map(storedRoles.map((entry) => [entry.user_id, entry.role]));
    const clips = await db.collection("clips").get();
    const [views, comments, reports] = await Promise.all([
      db.collectionGroup("views").count().get(),
      db.collectionGroup("comments").count().get(),
      sql<{ count: number }>`select count(*)::int as count from reports where status = 'pending'`,
    ]);
    const roles = { user: 0, creator: 0, company: 0 };
    const newUsersByDay = new Map<string, number>();
    for (const user of users) {
      const role = roleById.get(user.uid) ?? appRole(profiles.get(user.uid));
      roles[role as keyof typeof roles] += 1;
      const day = utcDay(Date.parse(user.metadata.creationTime));
      newUsersByDay.set(day, (newUsersByDay.get(day) ?? 0) + 1);
    }
    const newClipsByDay = new Map<string, number>();
    for (const entry of clips.docs) {
      const clip = entry.data().clip as Record<string, unknown> | undefined;
      const day = utcDay(dateMillis(entry.data().createdAt ?? clip?.createdAt));
      if (day !== "1970-01-01") newClipsByDay.set(day, (newClipsByDay.get(day) ?? 0) + 1);
    }
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (13 - index));
      return utcDay(date.getTime());
    });
    const userStatus = await sql<{ count: number }>`select count(*)::int as count from user_status where blocked_at is not null`;
    return {
      roles,
      totalUsers: users.length,
      blockedUsers: userStatus[0]?.count ?? 0,
      views: views.data().count,
      comments: comments.data().count,
      pendingReports: reports[0]?.count ?? 0,
      daily: days.map((date) => ({
        date,
        users: newUsersByDay.get(date) ?? 0,
        clips: newClipsByDay.get(date) ?? 0,
      })),
    };
  });

export const checkAdminPageAccess = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAllowlistedSession(context.bearerToken);
    return true;
  });

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(userSearchSchema)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.bearerToken, data.firebaseToken);
    const { auth, db } = getFirebaseAdmin();
    const term = data.query.toLowerCase();
    let users: FirebaseUser[];
    let nextPageToken: string | null = null;
    if (term) {
      const snapshot = await db.collection("users").get();
      const matches = snapshot.docs
        .filter((entry) =>
          [entry.id, entry.get("username"), entry.get("displayName")]
            .some((value) => typeof value === "string" && value.toLowerCase().includes(term)),
        )
        .map((entry) => entry.id);
      const emailMatch: string[] = [];
      if (term.includes("@")) {
        try {
          emailMatch.push((await auth.getUserByEmail(term)).uid);
        } catch (error) {
          const code = error && typeof error === "object" && "code" in error ? error.code : "";
          if (code !== "auth/user-not-found") throw error;
        }
      }
      const ids = [...new Set([...matches, ...emailMatch])].slice(0, 100);
      const records = await Promise.all(
        ids.map(async (id) => {
          try {
            return await auth.getUser(id);
          } catch (error) {
            const code = error && typeof error === "object" && "code" in error ? error.code : "";
            if (code === "auth/user-not-found") return null;
            throw error;
          }
        }),
      );
      users = records.filter((record): record is FirebaseUser => record !== null);
    } else {
      const page = await auth.listUsers(50, data.pageToken);
      users = page.users;
      nextPageToken = page.pageToken ?? null;
    }
    const refs = users.map((user) => db.collection("users").doc(user.uid));
    const profileDocs = refs.length ? await db.getAll(...refs) : [];
    const sql = await getSql();
    const statuses = users.length
      ? await sql<{ user_id: string; role: string; blocked_at: string | null; blocked_reason: string | null }>`
          select user_id, role, blocked_at, blocked_reason
          from user_status where user_id = any(${users.map((user) => user.uid)})
        `
      : [];
    const statusById = new Map(statuses.map((status) => [status.user_id, status]));
    return {
      users: users.map((user, index) => {
        const profile = profileDocs[index]?.exists ? profileDocs[index].data() : undefined;
        const status = statusById.get(user.uid);
        return {
          id: user.uid,
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          username: typeof profile?.username === "string" ? profile.username : "",
          role: status?.role ?? appRole(profile),
          blockedAt: status?.blocked_at ?? null,
          blockedReason: status?.blocked_reason ?? null,
          createdAt: user.metadata.creationTime,
          disabled: user.disabled,
        };
      }),
      nextPageToken,
    };
  });

export const getAdminUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ firebaseToken, userId: targetId }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.bearerToken, data.firebaseToken);
    const { auth, db } = getFirebaseAdmin();
    const user = await auth.getUser(data.userId);
    const [profileDoc, sql] = await Promise.all([
      db.collection("users").doc(data.userId).get(),
      getSql(),
    ]);
    const [statuses, audit] = await Promise.all([
      sql<{ role: string; blocked_at: string | null; blocked_reason: string | null }>`
        select role, blocked_at, blocked_reason
        from user_status where user_id = ${data.userId}
      `,
      sql<{ id: string; action: string; target_type: string; created_at: string }>`
        select id, action, target_type, created_at
        from admin_audit_log where target_id = ${data.userId} and target_type = 'user'
        order by created_at desc limit 20
      `,
    ]);
    const profile = profileDoc.data() ?? {};
    const status = statuses[0];
    return {
      id: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      username: typeof profile.username === "string" ? profile.username : "",
      role: status?.role ?? appRole(profile),
      blockedAt: status?.blocked_at ?? null,
      blockedReason: status?.blocked_reason ?? null,
      createdAt: user.metadata.creationTime,
      lastSignInAt: user.metadata.lastSignInTime ?? null,
      disabled: user.disabled,
      emailVerified: user.emailVerified,
      profile: {
        city: typeof profile.city === "string" ? profile.city : "",
        bio: typeof profile.bio === "string" ? profile.bio : "",
      },
      audit,
    };
  });

export const setAdminUserRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ firebaseToken, userId: targetId, role: roleSchema }))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.bearerToken, data.firebaseToken);
    const { auth, db } = getFirebaseAdmin();
    await auth.getUser(data.userId);
    await writeAudit(admin, "user.role.changed", "user", data.userId);
    const firestoreRole = data.role === "company" ? "business" : data.role;
    await db.collection("users").doc(data.userId).set(
      { role: firestoreRole, creatorMode: data.role === "creator", updatedAt: new Date() },
      { merge: true },
    );
    const sql = await getSql();
    await sql`
      insert into user_status (user_id, role)
      values (${data.userId}, ${data.role})
      on conflict (user_id) do update set role = excluded.role
    `;
    return { ok: true };
  });

const blockedUserInput = z.object({
  firebaseToken,
  userId: targetId,
  blocked: z.boolean(),
  reason: z.string().trim().min(3).max(300),
  confirm: z.boolean().default(false),
});

export const setAdminUserBlocked = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(blockedUserInput)
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.bearerToken, data.firebaseToken);
    if (admin.uid === data.userId && data.blocked) {
      throw new Error("No puedes bloquear tu propia cuenta.");
    }
    if (data.blocked && !data.confirm) throw new Error("Confirma el bloqueo de esta cuenta.");
    const { auth, db } = getFirebaseAdmin();
    await auth.getUser(data.userId);
    await writeAudit(admin, data.blocked ? "user.blocked" : "user.unblocked", "user", data.userId);
    await db.collection("user_status").doc(data.userId).set(
      {
        blocked: data.blocked,
        blockedAt: data.blocked ? new Date() : null,
        reason: data.blocked ? data.reason : null,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    const sql = await getSql();
    await sql`
      insert into user_status (user_id, role, blocked_at, blocked_reason)
      values (
        ${data.userId},
        coalesce((select role from user_status where user_id = ${data.userId}), 'user'),
        ${data.blocked ? new Date() : null},
        ${data.blocked ? data.reason : null}
      )
      on conflict (user_id) do update
      set blocked_at = excluded.blocked_at,
          blocked_reason = excluded.blocked_reason
    `;
    await auth.updateUser(data.userId, { disabled: data.blocked });
    return { ok: true };
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ firebaseToken, userId: targetId, confirm: z.literal(true) }))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.bearerToken, data.firebaseToken);
    if (admin.uid === data.userId) throw new Error("No puedes eliminar tu propia cuenta.");
    const { auth, db } = getFirebaseAdmin();
    await auth.getUser(data.userId);
    await writeAudit(admin, "user.deleted", "user", data.userId);
    await db.collection("user_status").doc(data.userId).set(
      { blocked: true, blockedAt: new Date(), reason: "Cuenta eliminada por administración" },
      { merge: true },
    );
    const sql = await getSql();
    await sql`
      insert into user_status (user_id, role, blocked_at, blocked_reason)
      values (
        ${data.userId},
        coalesce((select role from user_status where user_id = ${data.userId}), 'user'),
        now(),
        'Cuenta eliminada por administración'
      )
      on conflict (user_id) do update
      set blocked_at = excluded.blocked_at, blocked_reason = excluded.blocked_reason
    `;
    await db.collection("users").doc(data.userId).delete();
    await auth.deleteUser(data.userId);
    return { ok: true };
  });

export const listAdminClips = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ firebaseToken, query: z.string().trim().max(100).default("") }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.bearerToken, data.firebaseToken);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection("clips").orderBy("createdAt", "desc").get();
    const term = data.query.toLowerCase();
    const clips = await Promise.all(
      snapshot.docs.map(async (entry) => {
        const record = entry.data();
        const clip = (record.clip ?? {}) as Record<string, unknown>;
        const author = (record.author ?? {}) as Record<string, unknown>;
        const views = await entry.ref.collection("views").count().get();
        return {
          id: entry.id,
          caption: typeof clip.caption === "string" ? clip.caption : "",
          authorId: typeof record.authorId === "string" ? record.authorId : "",
          authorName: typeof author.displayName === "string" ? author.displayName : "",
          videoUrl: typeof clip.videoUrl === "string" ? clip.videoUrl : "",
          createdAt: dateMillis(record.createdAt ?? clip.createdAt),
          views: views.data().count,
          hiddenAt: dateMillis(record.hidden_at),
          deletedAt: dateMillis(record.deleted_at),
          hiddenReason: typeof record.hidden_reason === "string" ? record.hidden_reason : "",
        };
      }),
    );
    return clips.filter(
      (clip) => !term || `${clip.caption} ${clip.authorName} ${clip.id}`.toLowerCase().includes(term),
    );
  });

export const setAdminClipModeration = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({
    firebaseToken,
    clipId: targetId,
    action: z.enum(["hide", "restore", "delete"]),
    reason: z.string().trim().max(300).default(""),
    confirm: z.boolean().default(false),
  }))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.bearerToken, data.firebaseToken);
    if (data.action === "delete" && !data.confirm) throw new Error("Confirma el borrado.");
    const { db } = getFirebaseAdmin();
    const ref = db.collection("clips").doc(data.clipId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("El clip ya no existe.");
    if (data.action === "restore" && snapshot.get("deleted_at")) {
      throw new Error("Un clip eliminado no se puede restaurar porque su archivo ya se borró.");
    }
    await writeAudit(admin, `clip.${data.action}`, "clip", data.clipId);
    const now = new Date();
    const update =
      data.action === "hide"
        ? { hidden_at: now, hidden_by: admin.uid, hidden_reason: data.reason || "Oculto por moderación" }
        : data.action === "restore"
          ? { hidden_at: null, hidden_by: null, hidden_reason: null, deleted_at: null }
          : { deleted_at: now, hidden_by: admin.uid, hidden_reason: data.reason || "Eliminado por moderación" };
    await ref.set(update, { merge: true });
    if (data.action === "delete") {
      const clip = snapshot.get("clip") as Record<string, unknown> | undefined;
      const videoUrl = typeof clip?.videoUrl === "string" ? clip.videoUrl : "";
      if (videoUrl && /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//i.test(videoUrl)) {
        await del(videoUrl);
      }
    }
    return { ok: true };
  });

export const listAdminComments = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({
    firebaseToken,
    query: z.string().trim().max(100).default(""),
    onlyReported: z.boolean().default(false),
  }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.bearerToken, data.firebaseToken);
    const { db } = getFirebaseAdmin();
    const sql = await getSql();
    const reports = await sql<{ target_id: string; count: number }>`
      select target_id, count(*)::int as count from reports
      where target_type = 'comment' and status = 'pending'
      group by target_id
    `;
    const reportCounts = new Map(reports.map((report) => [report.target_id, report.count]));
    const snapshot = await db.collectionGroup("comments").orderBy("createdAt", "desc").get();
    const term = data.query.toLowerCase();
    return snapshot.docs
      .map((entry) => {
        const record = entry.data();
        const text = typeof record.text === "string" ? record.text : "";
        return {
          id: entry.id,
          clipId: entry.ref.parent.parent?.id ?? "",
          path: entry.ref.path,
          authorId: typeof record.authorId === "string" ? record.authorId : "",
          username: typeof record.username === "string" ? record.username : "",
          text,
          createdAt: dateMillis(record.createdAt),
          hiddenAt: dateMillis(record.hidden_at),
          deletedAt: dateMillis(record.deleted_at),
          hiddenReason: typeof record.hidden_reason === "string" ? record.hidden_reason : "",
          reportCount: reportCounts.get(entry.ref.path) ?? 0,
          reviewFlagged: isReviewFlagged(text),
          refPath: entry.ref.path,
        };
      })
      .filter((comment) =>
        (!data.onlyReported || comment.reportCount > 0) &&
        (!term || `${comment.text} ${comment.username} ${comment.clipId}`.toLowerCase().includes(term)),
      )
      .sort((left, right) => right.reportCount - left.reportCount || right.createdAt - left.createdAt);
  });

export const setAdminCommentModeration = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({
    firebaseToken,
    commentPath: z.string().regex(/^clips\/[A-Za-z0-9_-]{1,150}\/comments\/[A-Za-z0-9_-]{1,150}$/),
    action: z.enum(["hide", "restore", "delete"]),
    reason: z.enum(["offensive", "discrimination", "spam"]).optional(),
    confirm: z.boolean().default(false),
  }))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.bearerToken, data.firebaseToken);
    if (data.action === "delete" && !data.confirm) throw new Error("Confirma el borrado.");
    if (data.action !== "restore" && !data.reason) throw new Error("Selecciona el motivo de moderación.");
    const { db } = getFirebaseAdmin();
    const ref = db.doc(data.commentPath);
    if (!(await ref.get()).exists) throw new Error("El comentario ya no existe.");
    await writeAudit(admin, `comment.${data.action}`, "comment", data.commentPath);
    const now = new Date();
    await ref.set(
      data.action === "hide"
        ? { hidden_at: now, hidden_by: admin.uid, hidden_reason: data.reason }
        : data.action === "restore"
          ? { hidden_at: null, hidden_by: null, hidden_reason: null, deleted_at: null }
          : { deleted_at: now, hidden_by: admin.uid, hidden_reason: data.reason },
      { merge: true },
    );
    return { ok: true };
  });

export const listAdminReports = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ firebaseToken, status: z.enum(["pending", "resolved", "all"]).default("pending") }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.bearerToken, data.firebaseToken);
    const sql = await getSql();
    if (data.status === "all") {
      return sql<{ id: string; reporter_user_id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string }>`
        select id, reporter_user_id, target_type, target_id, reason, status, created_at
        from reports order by (status = 'pending') desc, created_at desc
      `;
    }
    return sql<{ id: string; reporter_user_id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string }>`
      select id, reporter_user_id, target_type, target_id, reason, status, created_at
      from reports where status = ${data.status} order by created_at desc
    `;
  });

export const resolveAdminReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ firebaseToken, reportId: targetId }))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.bearerToken, data.firebaseToken);
    const sql = await getSql();
    const result = await sql`
      select id from reports where id = ${data.reportId} and status = 'pending'
    `;
    if (!result.length) throw new Error("El reporte ya está resuelto o no existe.");
    await writeAudit(admin, "report.resolved", "report", data.reportId);
    const updated = await sql`
      update reports set status = 'resolved', resolved_at = now(), resolved_by = ${admin.adminId}
      where id = ${data.reportId} and status = 'pending'
      returning id
    `;
    if (!updated.length) throw new Error("El reporte ya está resuelto o no existe.");
    return { ok: true };
  });

export const listAdminPayments = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ firebaseToken }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.bearerToken, data.firebaseToken);
    const sql = await getSql();
    return sql<{ id: string; amount: string; user_id: string; type: string; created_at: string }>`
      select id, amount::text as amount, user_id, type, created_at
      from payments order by created_at desc
    `;
  });

export const createContentReport = createServerFn({ method: "POST" })
  .validator(z.object({
    firebaseToken,
    targetType: z.enum(["clip", "comment"]),
    targetId: z.string().min(1).max(400),
    reason: reportReasonSchema,
  }))
  .handler(async ({ data }) => {
    const reporter = await requireFirebaseUser(data.firebaseToken);
    const { db } = getFirebaseAdmin();
    if (data.targetType === "clip") {
      if (!/^[A-Za-z0-9_-]{1,150}$/.test(data.targetId)) throw new Error("El clip no es válido.");
      const target = await db.collection("clips").doc(data.targetId).get();
      if (!target.exists || target.get("deleted_at")) throw new Error("El contenido ya no está disponible.");
    } else {
      if (!/^clips\/[A-Za-z0-9_-]{1,150}\/comments\/[A-Za-z0-9_-]{1,150}$/.test(data.targetId)) {
        throw new Error("El comentario no es válido.");
      }
      const target = await db.doc(data.targetId).get();
      if (!target.exists || target.get("deleted_at")) {
        throw new Error("El contenido ya no está disponible.");
      }
    }
    const reportId = randomUUID();
    const sql = await getSql();
    const result = await sql`
      insert into reports (id, reporter_user_id, target_type, target_id, reason)
      values (${reportId}, ${reporter.uid}, ${data.targetType}, ${data.targetId}, ${data.reason})
      on conflict do nothing
      returning id
    `;
    if (!result.length) throw new Error("Ya has reportado este contenido y está pendiente de revisión.");
    return { ok: true };
  });
