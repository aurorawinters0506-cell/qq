import { createServerFn } from "@tanstack/react-start";

export type WhopIdentity = {
  id: string;
  name: string;
  plan: string;
  isAdmin?: boolean;
};

/**
 * Résout l'identité de l'utilisateur côté serveur.
 *
 * La résolution réelle est effectuée dans whop.server.ts :
 * - ADMIN LOCAL uniquement en développement
 * - utilisateur Whop normal avec abonnement valide
 * - aucun bypass admin en production
 *
 * Le navigateur ne fournit jamais directement l'identité.
 */
export const getWhopIdentity = createServerFn({
  method: "GET",
}).handler(async (): Promise<WhopIdentity | null> => {
  const { resolveWhopIdentity } =
    await import("./whop.server");

  return resolveWhopIdentity();
});