import { describe, expect, test } from "bun:test";

import { renderAuthEmail } from "./index";

describe("renderAuthEmail", () => {
  test.each(["verify-email", "reset-password"] as const)(
    "renders %s in branded HTML and plain text",
    async (purpose) => {
      const result = await renderAuthEmail({
        email: "cliente@example.com",
        expiresInMinutes: 10,
        purpose,
        url: "http://localhost:3001/api/auth/reset-password/test",
      });

      expect(result.html).toContain(
        purpose === "verify-email"
          ? "Verifica tu correo"
          : "Restablece tu contraseña"
      );
      expect(result.html).toContain(
        "http://localhost:3001/api/auth/reset-password/test"
      );
      expect(result.html).toContain("http://localhost:3001/logo.png");
      expect(result.text).toContain(
        purpose === "verify-email"
          ? "Verifica tu correo"
          : "Restablece tu contraseña"
      );
      expect(result.text).toContain("Este enlace caduca en 10 minutos");
      expect(result.text).toContain(
        "http://localhost:3001/api/auth/reset-password/test"
      );
    }
  );
});
