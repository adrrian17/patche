/// <reference types="@cloudflare/workers-types" />

import type { ServerEnv } from "@patche/env/server";

declare global {
  interface Env extends ServerEnv {
    DB: ServerEnv["DB"];
  }
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends ServerEnv {
      DB: ServerEnv["DB"];
    }
  }
}
