import { createServerFn } from "@tanstack/react-start";

export type WhopIdentity = {
  id: string;
  name: string;
  plan: string;
};

export const getWhopIdentity = createServerFn({ method: "GET" }).handler(
  async (): Promise<WhopIdentity | null> => {
    const { resolveWhopIdentity } = await import("./whop.server");
    return resolveWhopIdentity();
  },
);
