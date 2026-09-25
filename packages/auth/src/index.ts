import { createDb } from "@patche/db";
import * as schema from "@patche/db/schema/auth";
import { renderMagicLinkEmail } from "@patche/email";
import { env } from "@patche/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { magicLink } from "better-auth/plugins/magic-link";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: { enabled: false },
    plugins: [
      admin({ adminRoles: ["admin"], defaultRole: "user" }),
      magicLink({
        expiresIn: 10 * 60,
        rateLimit: { max: 5, window: 60 },
        sendMagicLink: async ({ email, url }) => {
          const { html, text } = await renderMagicLinkEmail({
            email,
            expiresInMinutes: 10,
            url,
          });

          await env.AUTH_EMAIL.send({
            from: "noreply@adrianayala.mx",
            html,
            subject: "Tu enlace para entrar a Patche",
            text,
            to: email,
          });
        },
        storeToken: "hashed",
      }),
      tanstackStartCookies(),
    ],
    rateLimit: {
      storage: "database",
    },
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
  });
}
