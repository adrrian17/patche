export interface PublicUser {
  email: string;
  id: string;
  name: string;
  role: string;
}

export interface PublicSession {
  user: PublicUser;
}

interface SessionWithUser {
  user: {
    email: string;
    id: string;
    name: string;
    role?: string | null;
  };
}

export function toPublicSession(session: SessionWithUser): PublicSession {
  return {
    user: {
      email: session.user.email,
      id: session.user.id,
      name: session.user.name,
      role: session.user.role ?? "user",
    },
  };
}
