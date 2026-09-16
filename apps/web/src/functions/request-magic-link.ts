import { createAuth } from "@patche/auth";
import { createDb } from "@patche/db";
import { user } from "@patche/db/schema/auth";
import { env } from "@patche/env/server";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
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
    const existingUser = await createDb()
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
