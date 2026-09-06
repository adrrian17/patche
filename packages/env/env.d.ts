import type { WebEnv } from "@patche/infra/alchemy.run";

// This file infers types for the cloudflare:workers environment from your Alchemy Worker.
// @see https://alchemy.run/cloudflare/compute/workers

declare global {
  type Env = WebEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    // oxlint-disable-next-line typescript(no-empty-interface), typescript(no-empty-object-type)
    export interface Env extends WebEnv {}
  }
}
