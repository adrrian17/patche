import type { ServerEnv } from "./src/server";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends ServerEnv {}
  }
}
