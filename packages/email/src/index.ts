import { createElement } from "react";
import { render, toPlainText } from "react-email";

import { MagicLinkEmail } from "./magic-link-email";
import type { MagicLinkEmailProps } from "./magic-link-email";

export { MagicLinkEmail, type MagicLinkEmailProps } from "./magic-link-email";

export async function renderMagicLinkEmail(
  props: MagicLinkEmailProps
): Promise<{ html: string; text: string }> {
  const html = await render(createElement(MagicLinkEmail, props));

  return {
    html,
    text: toPlainText(html),
  };
}
