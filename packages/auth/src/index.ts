import { createDb } from "@patche/db";
import * as schema from "@patche/db/schema/auth";
import { env } from "@patche/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    databaseHooks: {
      user: {
        create: {
          before(user) {
            if (user.email !== env.ADMIN_EMAIL) {
              return Promise.resolve();
            }

            return Promise.resolve({
              data: {
                ...user,
                role: "admin",
              },
            });
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      admin({ adminRoles: ["admin"], defaultRole: "user" }),
      tanstackStartCookies(),
    ],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
  });
}
