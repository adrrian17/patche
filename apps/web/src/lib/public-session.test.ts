import { describe, expect, test } from "bun:test";

import { toPublicSession } from "./public-session";

describe("toPublicSession", () => {
  test("returns only client-safe user fields", () => {
    const internalSession = {
      session: {
        createdAt: new Date("2026-09-15T00:00:00.000Z"),
        id: "session_1",
        ipAddress: "203.0.113.10",
        token: "private-session-token",
        userAgent: "test-agent",
      },
      user: {
        email: "admin@patche.mx",
        emailVerified: true,
        id: "user_1",
        name: "Admin",
        role: "admin",
      },
    };

    const result = toPublicSession(internalSession);

    expect(result).toEqual({
      user: {
        email: "admin@patche.mx",
        id: "user_1",
        name: "Admin",
        role: "admin",
      },
    });
    expect(JSON.stringify(result)).not.toContain("private-session-token");
    expect(JSON.stringify(result)).not.toContain("203.0.113.10");
  });

  test("uses the default user role when the internal role is absent", () => {
    expect(
      toPublicSession({
        user: {
          email: "customer@patche.mx",
          id: "user_2",
          name: "Customer",
          role: null,
        },
      })
    ).toEqual({
      user: {
        email: "customer@patche.mx",
        id: "user_2",
        name: "Customer",
        role: "user",
      },
    });
  });
});
