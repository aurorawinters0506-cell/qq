import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { useWhopUser } from "@/components/app-shell";
import { PreviewDialog } from "@/components/preview-dialog";
import { TemplateCard } from "@/components/template-card";
import { SkeletonGrid } from "@/routes/index";
import {
  categoriesQuery,
  favoritesQuery,
  getFileUrl,
  recordDownload,
  type Template,
} from "@/lib/catalog";

export const Route = createFileRoute("/favoris")({
  head: () => ({
    meta: [
      { title: "My Favorites — Smart Point" },
      {
        name: "description",
        content:
          "Find every PowerPoint template you saved to your Smart Point favorites.",
      },
      { property: "og:title", content: "My Favorites — Smart Point" },
      {
        property: "og:description",
        content: "Your saved PowerPoint templates, ready to download.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const user = useWhopUser();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<Template | null>(null);
  const favorites = useQuery(favoritesQuery(user.id));
  const categories = useQuery(categoriesQuery());

  async function handleDownload(template: Template, format: "pdf" | "pptx") {
    const path = format === "pdf" ? template.pdf_path : template.pptx_path;
    const url = path ? await getFileUrl(path) : null;
    await recordDownload(user.id, template.id, format);
    queryClient.invalidateQueries({ queryKey: ["downloads", user.id] });
    if (url) window.open(url, "_blank", "noopener");
    else toast.info(`${format.toUpperCase()} file has not been added yet`);
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-bold">Favorites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {favorites.data?.length ?? 0} saved template(s).
        </p>
      </header>

      {favorites.isPending ? (
        <SkeletonGrid />
      ) : (favorites.data ?? []).length === 0 ? (
        <p className="panel p-8 text-center text-sm text-muted-foreground">
          No favorites yet. Select the heart on a template to save it here.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {(favorites.data ?? []).map(({ template }) => (
            <TemplateCard
              key={template.id}
              template={template}
              category={categories.data?.find((c) => c.id === template.category_id)}
              userId={user.id}
              isFavorite
              onPreview={setPreview}
            />
          ))}
        </div>
      )}

      <PreviewDialog
        template={preview}
        onOpenChange={(open) => !open && setPreview(null)}
        onDownload={handleDownload}
      />
    </div>
  );
}
