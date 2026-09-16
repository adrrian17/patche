import { createAuth } from "@patche/auth";
import { createDb } from "@patche/db";
import { rateLimit, user } from "@patche/db/schema/auth";
import { env } from "@patche/env/server";
import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const requestSchema = z.object({
  email: z.email(),
  mode: z.enum(["register", "sign-in"]),
  name: z.string().trim().min(2).max(120).optional(),
});

interface MagicLinkRequestBody {
  callbackURL: string;
  email: string;
  errorCallbackURL: string;
  name?: string;
  newUserCallbackURL: string;
}

export const requestMagicLink = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const db = createDb();
    const now = Math.floor(Date.now() / 1000);

    await db.run(sql`
      INSERT INTO ${rateLimit} (key, count, last_request)
      VALUES (${`magic-link:${email}`}, 1, ${now})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN ${now} - last_request >= 60 THEN 1
          ELSE count + 1
        END,
        last_request = CASE
          WHEN ${now} - last_request >= 60 THEN ${now}
          ELSE last_request
        END
    `);

    const currentRateLimit = await db
      .select({ count: rateLimit.count })
      .from(rateLimit)
      .where(eq(rateLimit.key, `magic-link:${email}`))
      .get();

    if (currentRateLimit && currentRateLimit.count > 5) {
      return { accepted: true };
    }

    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .get();

    if (data.mode === "sign-in" && !existingUser) {
      return { accepted: true };
    }

    const body: MagicLinkRequestBody = {
      callbackURL: "/auth/continue",
      email,
      errorCallbackURL: "/login",
      newUserCallbackURL: "/auth/continue",
    };

    if (data.mode === "register" && !existingUser && data.name) {
      body.name = data.name;
    }

    const result = await createAuth().api.signInMagicLink({
      body,
      headers: new Headers({
        origin: new URL(env.BETTER_AUTH_URL).origin,
      }),
    });

    return { accepted: result.status };
  });
