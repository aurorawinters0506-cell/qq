import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import preview1 from "@/assets/preview-1.jpg";
import preview2 from "@/assets/preview-2.jpg";
import preview3 from "@/assets/preview-3.jpg";
import preview4 from "@/assets/preview-4.jpg";

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  accent: string;
  sort_order: number;
};

export type Template = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category_id: string;
  preview_variant: number;
  slides: number;
  pdf_path: string | null;
  pptx_path: string | null;
  created_at: string;
};

export const PREVIEWS = [preview1, preview2, preview3, preview4];

export function previewFor(variant: number) {
  return PREVIEWS[(variant - 1 + PREVIEWS.length) % PREVIEWS.length];
}

export type SortKey = "recent" | "name" | "slides";

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, icon, accent, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

export const templateCountsQuery = () =>
  queryOptions({
    queryKey: ["template-counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("templates")
        .select("category_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
      }
      return counts;
    },
  });

export const templatesQuery = (params: {
  categoryId?: string | undefined;
  search?: string | undefined;
  sort?: SortKey | undefined;
}) =>
  queryOptions({
    queryKey: ["templates", params],
    queryFn: async (): Promise<Template[]> => {
      let query = supabase.from("templates").select("*");
      if (params.categoryId) query = query.eq("category_id", params.categoryId);
      if (params.search && params.search.trim()) {
        const term = `%${params.search.trim()}%`;
        query = query.or(`title.ilike.${term},code.ilike.${term}`);
      }
      if (params.sort === "name") query = query.order("title");
      else if (params.sort === "slides") query = query.order("slides", { ascending: false });
      else query = query.order("code");
      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

export const favoritesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["favorites", userId],
    queryFn: async (): Promise<{ template_id: string; template: Template }[]> => {
      const { data, error } = await supabase
        .from("favorites")
        .select("template_id, templates(*)")
        .eq("whop_user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((row: { templates: unknown }) => row.templates)
        .map((row: { template_id: string; templates: unknown }) => ({
          template_id: row.template_id,
          template: row.templates as Template,
        }));
    },
  });

export const downloadsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["downloads", userId],
    queryFn: async (): Promise<
      { id: string; format: string; created_at: string; template: Template }[]
    > => {
      const { data, error } = await supabase
        .from("downloads")
        .select("id, format, created_at, templates(*)")
        .eq("whop_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? [])
        .filter((row: { templates: unknown }) => row.templates)
        .map((row: { id: string; format: string; created_at: string; templates: unknown }) => ({
          id: row.id,
          format: row.format,
          created_at: row.created_at,
          template: row.templates as Template,
        }));
    },
  });

export async function toggleFavorite(
  userId: string,
  templateId: string,
  isFavorite: boolean,
) {
  if (isFavorite) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("whop_user_id", userId)
      .eq("template_id", templateId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("favorites")
    .insert({ whop_user_id: userId, template_id: templateId });
  if (error) throw error;
  return true;
}

export async function recordDownload(
  userId: string,
  templateId: string,
  format: "pdf" | "pptx",
) {
  const { error } = await supabase
    .from("downloads")
    .insert({ whop_user_id: userId, template_id: templateId, format });
  if (error) throw error;
}

/** Signed URL for a file stored in the private `template-files` bucket. */
export async function getFileUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("template-files")
    .createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data?.signedUrl ?? null;
}
