import { createDb } from "@patche/db";
import * as schema from "@patche/db/schema/auth";
import { renderAuthEmail } from "@patche/email";
import { env } from "@patche/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const { html, text } = await renderAuthEmail({
          email: user.email,
          expiresInMinutes: 30,
          purpose: "reset-password",
          url,
        });
        await env.AUTH_EMAIL.send({
          from: "noreply@adrianayala.mx",
          html,
          subject: "Restablece tu contraseña de Patche",
          text,
          to: user.email,
        });
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendOnSignIn: true,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        const { html, text } = await renderAuthEmail({
          email: user.email,
          expiresInMinutes: 60,
          purpose: "verify-email",
          url,
        });
        await env.AUTH_EMAIL.send({
          from: "noreply@adrianayala.mx",
          html,
          subject: "Verifica tu correo en Patche",
          text,
          to: user.email,
        });
      },
    },
    plugins: [
      admin({ adminRoles: ["admin"], defaultRole: "user" }),
      tanstackStartCookies(),
    ],
    rateLimit: {
      customRules: {
        "/request-password-reset": { max: 5, window: 60 },
        "/send-verification-email": { max: 5, window: 60 },
      },
      enabled: true,
      storage: "database",
    },
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
  });
}
