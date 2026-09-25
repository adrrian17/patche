import { execFileSync } from "node:child_process";

import { persistDir } from "./env";

// Emails come from the test itself, never from user input.
export function promoteToAdmin(email: string) {
  execFileSync(
    "../../node_modules/.bin/wrangler",
    [
      "d1",
      "execute",
      "patche",
      "--local",
      "--config",
      "../../wrangler.jsonc",
      "--persist-to",
      persistDir,
      "--command",
      `UPDATE user SET role = 'admin' WHERE email = '${email}'`,
    ],
    { stdio: "pipe" }
  );
}
