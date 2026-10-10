import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type SavedProfile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  city: string;
  avatarUrl: string;
  role: string;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<SavedProfile>`
      select user_id as "userId", username, display_name as "displayName",
             bio, city, avatar_url as "avatarUrl", role
      from profiles
      where user_id = ${context.userId}
      limit 1
    `;
    return rows[0] ?? null;
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    username: string;
    displayName: string;
    bio: string;
    city: string;
    avatarUrl: string;
    role: string;
  }) => ({
    username: input.username.trim().replace(/^@/, "").toLowerCase().slice(0, 24) || "usuario",
    displayName: input.displayName.trim().slice(0, 40) || "Usuario",
    bio: input.bio.trim().slice(0, 180),
    city: input.city.trim().slice(0, 40) || "Parla",
    avatarUrl: input.avatarUrl.slice(0, 350_000),
    role: ["user", "creator", "business"].includes(input.role) ? input.role : "user",
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, username, display_name, bio, city, avatar_url, role, updated_at)
      values (
        ${context.userId}, ${data.username}, ${data.displayName}, ${data.bio},
        ${data.city}, ${data.avatarUrl}, ${data.role}, now()
      )
      on conflict (user_id) do update set
        username = excluded.username,
        display_name = excluded.display_name,
        bio = excluded.bio,
        city = excluded.city,
        avatar_url = excluded.avatar_url,
        role = excluded.role,
        updated_at = now()
    `;
    return data;
  });
