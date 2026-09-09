import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const SEEN_KEY = "smartpoint.notifications_seen_at";
export const NEW_TEMPLATE_THRESHOLD = 10;

export type CategoryAlert = {
  categoryId: string;
  count: number;
  latestAt: string;
};

export function getSeenAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SEEN_KEY);
}

export function markNotificationsSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEEN_KEY, new Date().toISOString());
}

/**
 * A notification is raised as soon as a category has received at least
 * 10 new templates since the member last opened the notification panel.
 */
export const newTemplatesQuery = (seenAt: string | null) =>
  queryOptions({
    queryKey: ["new-templates", seenAt],
    queryFn: async (): Promise<CategoryAlert[]> => {
      let query = supabase
        .from("templates")
        .select("category_id, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (seenAt) query = query.gt("created_at", seenAt);

      const { data, error } = await query;
      if (error) throw error;

      const groups = new Map<string, CategoryAlert>();
      for (const row of data ?? []) {
        const current = groups.get(row.category_id);
        if (current) current.count += 1;
        else
          groups.set(row.category_id, {
            categoryId: row.category_id,
            count: 1,
            latestAt: row.created_at,
          });
      }
      return [...groups.values()]
        .filter((group) => group.count >= NEW_TEMPLATE_THRESHOLD)
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60_000,
  });
