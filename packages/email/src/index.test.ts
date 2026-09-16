import { describe, expect, test } from "bun:test";

import { renderMagicLinkEmail } from "./index";

describe("renderMagicLinkEmail", () => {
  test("renders branded HTML and a plain-text fallback", async () => {
    const result = await renderMagicLinkEmail({
      email: "cliente@example.com",
      expiresInMinutes: 10,
      url: "http://localhost:3001/api/auth/magic-link/verify?token=test",
    });

    expect(result.html).toContain("Tu enlace para entrar a Patche");
    expect(result.html).toContain(
      "http://localhost:3001/api/auth/magic-link/verify?token=test"
    );
    expect(result.html).toContain("https://patche.mx/logo.png");
    expect(result.text).toContain("Tu enlace para entrar a Patche");
    expect(result.text).toContain("Este enlace caduca en 10 minutos");
    expect(result.text).toContain(
      "http://localhost:3001/api/auth/magic-link/verify?token=test"
    );
  });
});
