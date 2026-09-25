import { getRequestHeader } from "@tanstack/react-start/server";

export type WhopIdentity = {
  id: string;
  name: string;
  plan: string;
  isAdmin: boolean;
};

const WHOP_PRODUCT_ID =
  process.env["WHOP_PRODUCT_ID"] ?? "prod_JklFk53fvcISG";

const LOCAL_ADMIN_WHOP_USER_ID =
  process.env["LOCAL_ADMIN_WHOP_USER_ID"] ?? "";

const WHOP_API_KEY = process.env["WHOP_API_KEY"] ?? "";

type WhopUser = {
  id?: string;
  username?: string;
  name?: string;
  email?: string;
};

type WhopMembership = {
  status?: string;
  product?: {
    id?: string;
  };
};

function isLocalDevelopment(): boolean {
  return (
    process.env["NODE_ENV"] !== "production" &&
    process.env["VITE_DEV"] !== "false"
  );
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");

    const padded =
      normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

    const decoded = atob(padded);

    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return false;
  }

  const exp = payload["exp"];

  if (typeof exp !== "number") {
    return false;
  }

  return exp * 1000 <= Date.now();
}

async function getWhopUser(
  userId: string,
  apiKey: string,
): Promise<WhopUser | null> {
  try {
    const response = await fetch(
      `https://api.whop.com/api/v5/app/users/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `[Smart Point] Whop user request failed: ${response.status}`,
      );

      return null;
    }

    return (await response.json()) as WhopUser;
  } catch (error) {
    console.error("[Smart Point] Unable to fetch Whop user.", error);

    return null;
  }
}

export async function hasWhopProductAccess(
  userId: string,
  apiKey: string,
): Promise<boolean> {
  if (!userId || !apiKey) {
    return false;
  }

  try {
    const url = new URL(
      "https://api.whop.com/api/v5/memberships",
    );

    url.searchParams.set("user_id", userId);
    url.searchParams.set("product_id", WHOP_PRODUCT_ID);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[Smart Point] Membership request failed: ${response.status}`,
      );

      return false;
    }

    const data = (await response.json()) as
      | WhopMembership[]
      | {
          data?: WhopMembership[];
          memberships?: WhopMembership[];
        };

    const memberships = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.memberships)
          ? data.memberships
          : [];

    return memberships.some((membership) => {
      const status = membership.status?.toLowerCase();

      return (
        status === "active" ||
        status === "trialing" ||
        status === "completed"
      );
    });
  } catch (error) {
    console.error(
      "[Smart Point] Unable to verify Whop membership.",
      error,
    );

    return false;
  }
}

export async function resolveWhopIdentity(): Promise<WhopIdentity | null> {
  const userToken = getRequestHeader("x-whop-user-token");

  if (!userToken) {
    if (
      isLocalDevelopment() &&
      LOCAL_ADMIN_WHOP_USER_ID &&
      WHOP_API_KEY
    ) {
      const user = await getWhopUser(
        LOCAL_ADMIN_WHOP_USER_ID,
        WHOP_API_KEY,
      );

      if (!user) {
        return null;
      }

      return {
        id: LOCAL_ADMIN_WHOP_USER_ID,
        name:
          user.name ??
          user.username ??
          "Smart Point Admin",
        plan: "Whop User",
        isAdmin: true,
      };
    }

    return null;
  }

  if (isTokenExpired(userToken)) {
    console.error("[Smart Point] Whop user token has expired.");

    return null;
  }

  const payload = decodeJwtPayload(userToken);

  if (!payload) {
    console.error("[Smart Point] Invalid Whop user token.");

    return null;
  }

  const rawUserId =
    payload["user_id"] ??
    payload["sub"] ??
    payload["id"];

  if (typeof rawUserId !== "string" || !rawUserId) {
    console.error(
      "[Smart Point] No user ID found in Whop user token.",
    );

    return null;
  }

  const userId = rawUserId;

  if (!WHOP_API_KEY) {
    console.error(
      "[Smart Point] WHOP_API_KEY is missing.",
    );

    return {
      id: userId,
      name:
        typeof payload["name"] === "string"
          ? payload["name"]
          : "Whop User",
      plan: "Whop User",
      isAdmin: false,
    };
  }

  const user = await getWhopUser(userId, WHOP_API_KEY);

  if (!user) {
    return null;
  }

  return {
    id: userId,
    name:
      user.name ??
      user.username ??
      (typeof payload["name"] === "string"
        ? payload["name"]
        : "Whop User"),
    plan: "Whop User",
    isAdmin:
      Boolean(LOCAL_ADMIN_WHOP_USER_ID) &&
      userId === LOCAL_ADMIN_WHOP_USER_ID,
  };
}