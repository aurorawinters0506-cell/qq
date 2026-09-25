import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { useWhopUser } from "@/components/app-shell";
import { PreviewDialog } from "@/components/preview-dialog";
import { TemplateCard } from "@/components/template-card";

import {
  favoritesQuery,
  toggleFavorite,
  type Template,
} from "@/lib/catalog";


/* =========================================================
   ROUTE
   ========================================================= */

export const Route = createFileRoute("/favoris")({
  head: () => ({
    meta: [
      {
        title: "My Favorites — Smart Point",
      },
      {
        name: "description",
        content:
          "Find every PowerPoint template you saved to your Smart Point favorites.",
      },
      {
        property: "og:title",
        content: "My Favorites — Smart Point",
      },
      {
        property: "og:description",
        content:
          "Your saved PowerPoint templates, ready to download.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),

  component: FavoritesPage,
});


/* =========================================================
   FAVORITES SKELETON
   ========================================================= */

/**
 * Skeleton local à la page Favorites.
 *
 * IMPORTANT:
 * On ne dépend plus de SkeletonGrid exporté par
 * "@/routes/index", car l'index actuel ne l'exporte pas.
 */
function FavoritesSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="aspect-[16/10] animate-pulse bg-muted" />

          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />

            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />

            <div className="flex gap-2">
              <div className="h-9 flex-1 animate-pulse rounded bg-muted" />

              <div className="h-9 flex-1 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


/* =========================================================
   HOME / FAVORITES PAGE
   ========================================================= */

function FavoritesPage() {
  const user = useWhopUser();

  const queryClient = useQueryClient();

  const [preview, setPreview] =
    useState<Template | null>(null);


  /* -------------------------------------------------------
     FAVORITES QUERY
     ------------------------------------------------------- */

  const favorites = useQuery(
    favoritesQuery(user.id),
  );


  /* -------------------------------------------------------
     REMOVE FAVORITE
     ------------------------------------------------------- */

  async function handleToggleFavorite(
    template: Template,
  ) {
    const templateId =
      template.id ??
      template.template_id;

    if (!templateId) {
      toast.error(
        "Impossible d'identifier ce template.",
      );

      return;
    }

    try {
      /*
       * IMPORTANT:
       * false = retirer le favori.
       *
       * L'ancien code envoyait true ici, ce qui demandait
       * de conserver/ajouter le favori au lieu de le retirer.
       */
      await toggleFavorite(
        user.id,
        templateId,
        false,
      );

      await queryClient.invalidateQueries({
        queryKey: [
          "favorites",
          user.id,
        ],
      });

      toast.success(
        "Retiré des favoris.",
      );
    } catch (error) {
      console.error(
        "[Smart Point] remove favorite:",
        error,
      );

      toast.error(
        "Impossible de modifier les favoris.",
      );
    }
  }


  /* -------------------------------------------------------
     SECURE DOWNLOAD
     ------------------------------------------------------- */

  async function handleDownload(
    template: Template,
    format: "pdf" | "pptx",
  ) {
    const templateId =
      template.id ??
      template.template_id;

    if (!templateId) {
      toast.error(
        "Impossible d'identifier ce template.",
      );

      return;
    }

    try {
      toast.loading(
        `Préparation du ${format.toUpperCase()}...`,
        {
          id: "smart-point-download",
        },
      );

      const response =
        await fetch(
          `/api/download?template_id=${encodeURIComponent(
            templateId,
          )}&file_type=${encodeURIComponent(
            format,
          )}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Accept:
                "application/octet-stream",
            },
          },
        );

      if (!response.ok) {
        let message =
          "Impossible de télécharger ce fichier.";

        try {
          const contentType =
            response.headers.get(
              "content-type",
            );

          if (
            contentType?.includes(
              "application/json",
            )
          ) {
            const data =
              await response.json();

            if (
              typeof data?.message ===
              "string"
            ) {
              message =
                data.message;
            } else if (
              typeof data?.error ===
              "string"
            ) {
              message =
                data.error;
            }
          } else {
            const text =
              await response.text();

            if (text.trim()) {
              message =
                text.trim();
            }
          }
        } catch {
          // Message par défaut conservé.
        }

        throw new Error(message);
      }

      const blob =
        await response.blob();

      if (blob.size === 0) {
        throw new Error(
          "Le fichier téléchargé est vide.",
        );
      }

      const contentDisposition =
        response.headers.get(
          "content-disposition",
        );

      let filename =
        `${templateId}.${format}`;

      const filenameMatch =
        contentDisposition?.match(
          /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i,
        );

      if (filenameMatch) {
        try {
          filename =
            decodeURIComponent(
              filenameMatch[1] ??
                filenameMatch[2] ??
                filename,
            );
        } catch {
          filename =
            filenameMatch[1] ??
            filenameMatch[2] ??
            filename;
        }
      }

      const objectUrl =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      anchor.href =
        objectUrl;

      anchor.download =
        filename;

      anchor.style.display =
        "none";

      document.body.appendChild(
        anchor,
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        objectUrl,
      );

      toast.success(
        `${format.toUpperCase()} téléchargé avec succès.`,
        {
          id: "smart-point-download",
        },
      );

      await queryClient.invalidateQueries({
        queryKey: [
          "downloads",
          user.id,
        ],
      });
    } catch (error) {
      console.error(
        "[Smart Point] secure download:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de télécharger le fichier.",
        {
          id: "smart-point-download",
        },
      );
    }
  }


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="space-y-6 p-4 lg:p-6">

      {/* ===================================================
          HEADER
          =================================================== */}

      <header>
        <h1 className="text-2xl font-bold">
          Favorites
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {favorites.data?.length ?? 0} saved template(s).
        </p>
      </header>


      {/* ===================================================
          CONTENT
          =================================================== */}

      {favorites.isPending ? (

        <FavoritesSkeleton />

      ) : favorites.isError ? (

        <div className="panel p-8 text-center">

          <h2 className="font-semibold">
            Impossible de charger les favoris.
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez la connexion à Supabase et
            l'identifiant utilisateur utilisé en local.
          </p>

          <button
            type="button"
            className="mt-5 rounded-md border border-border px-4 py-2 text-sm"
            onClick={() =>
              favorites.refetch()
            }
          >
            Réessayer
          </button>

        </div>

      ) : (favorites.data ?? []).length === 0 ? (

        <p className="panel p-8 text-center text-sm text-muted-foreground">
          Aucun favori pour le moment. Sélectionnez
          le cœur d'un template pour l'enregistrer ici.
        </p>

      ) : (

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

          {(favorites.data ?? []).map(
            ({ template }) => {

              /*
               * favoritesQuery peut retourner un élément
               * sans template associé.
               *
               * On l'ignore proprement afin que TypeScript
               * sache que template est défini pour le rendu.
               */
              if (!template) {
                return null;
              }

              const templateId =
                template.id ??
                template.template_id;

              return (
                <TemplateCard
                  key={templateId}
                  template={template}
                  isFavorite
                  onPreview={setPreview}
                  onToggleFavorite={
                    handleToggleFavorite
                  }
                  onDownload={
                    handleDownload
                  }
                />
              );
            },
          )}

        </div>

      )}


      {/* ===================================================
          PREVIEW DIALOG
          =================================================== */}

      <PreviewDialog
        template={preview}
        onOpenChange={(open) => {
          if (!open) {
            setPreview(null);
          }
        }}
        onDownload={
          handleDownload
        }
      />

    </div>
  );
}

