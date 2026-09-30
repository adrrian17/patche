import { createElement } from "react";
import { render, toPlainText } from "react-email";

import { AuthEmail } from "./auth-email";
import type { AuthEmailProps } from "./auth-email";

export { AuthEmail, type AuthEmailProps } from "./auth-email";

export async function renderAuthEmail(
  props: AuthEmailProps
): Promise<{ html: string; text: string }> {
  const html = await render(createElement(AuthEmail, props));

  return {
    html,
    text: toPlainText(html),
  };
}
