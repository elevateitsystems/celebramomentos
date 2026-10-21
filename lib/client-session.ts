"use client";

export type SessionUser = { id: string; name: string; email: string; phone?: string | null };

// The header and several pages need the signed-in customer. Share a single
// in-flight request instead of calling /api/auth/me from each component.
let request: Promise<SessionUser | null> | null = null;

export function getSessionUser({ refresh = false } = {}) {
  if (!request || refresh) {
    request = fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { user?: SessionUser | null }) => body.user || null)
      .catch(() => {
        request = null;
        return null;
      });
  }
  return request;
}

export function clearSessionUser() {
  request = Promise.resolve(null);
}
