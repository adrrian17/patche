import { createAuth } from "@patche/auth";

export function isAdminUser(user: {
  role?: string | null | undefined;
}): boolean {
  return user.role === "admin";
}

export async function getRequestSession(request: Request) {
  return await createAuth().api.getSession({
    headers: request.headers,
  });
}
