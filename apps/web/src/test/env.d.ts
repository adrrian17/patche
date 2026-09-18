import type { D1Migration } from "@cloudflare/vitest-plugin";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
