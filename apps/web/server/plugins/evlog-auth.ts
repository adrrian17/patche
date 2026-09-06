import { createAuth } from "@patche/auth";
import { createAuthIdentifier } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", async (event) => {
    // SAFETY: createAuth returns the Better Auth instance used by evlog's adapter.
    const identify = createAuthIdentifier(createAuth() as BetterAuthInstance, {
      exclude: ["/api/auth/**"],
      maskEmail: true,
    });
    await identify(event);
  });
});
