import { getRequestHeader } from "@tanstack/react-start/server";

export type WhopIdentity = {
  id: string;
  name: string;
  plan: string;
};

function decodeJwtSub(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(
      Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    ) as { sub?: string; user_id?: string };
    return json.sub ?? json.user_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves the member from the signed Whop token that Whop forwards on every
 * embedded request. Returns null when the app is not running inside Whop.
 */
export async function resolveWhopIdentity(): Promise<WhopIdentity | null> {
  const token =
    getRequestHeader("x-whop-user-token") ??
    getRequestHeader("X-Whop-User-Token");
  if (!token) return null;

  const userId = decodeJwtSub(token);
  if (!userId) return null;

  const apiKey = process.env["WHOP_API_KEY"];
  let name = userId;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://api.whop.com/api/v5/app/users/${userId}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (response.ok) {
        const user = (await response.json()) as {
          username?: string;
          name?: string;
        };
        name = user.username ?? user.name ?? userId;
      }
    } catch {
      /* fall back to the id when the Whop API is unreachable */
    }
  }

  return { id: userId, name, plan: "Premium Member" };
}
