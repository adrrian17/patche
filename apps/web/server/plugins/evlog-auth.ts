import { createAuth } from "@patche/auth";
import { createAuthMiddleware } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";
import { useLogger } from "evlog/nitro/v3";
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  // SAFETY: createAuth returns a Better Auth instance with api.getSession.
  const identify = createAuthMiddleware(createAuth() as BetterAuthInstance, {
    exclude: ["/api/auth/**"],
    maskEmail: true,
  });

  nitroApp.hooks.hook("request", async (event) => {
    const path = new URL(event.req.url).pathname;

    await identify(useLogger(event), event.req.headers, path);
  });
});
