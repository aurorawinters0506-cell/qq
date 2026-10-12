import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useWhopUser } from "@/components/app-shell";
import { PreviewDialog } from "@/components/preview-dialog";
import { TemplateCard } from "@/components/template-card";

import {
  favoritesQuery,
  toggleFavorite,
  type Template,
} from "@/lib/catalog";

const WHOP_CHECKOUT_URL =
  "https://whop.com/checkout/plan_5mxur1ghQi3Vk";

export const Route = createFileRoute("/favoris")({
  head: () => ({
    meta: [
      {
        title: "My Favorites — Smart Point",
      },
      {
        name: "description",
        content:
          "Save your favorite Smart Point PowerPoint templates.",
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
   SKELETON
   ========================================================= */

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
   SUBSCRIPTION REQUIRED
   ========================================================= */

function SubscriptionRequired() {
  function handleSubscribe() {
    window.location.href = WHOP_CHECKOUT_URL;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
      <div className="panel w-full p-8 text-center sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10">
          <Heart className="h-8 w-8 text-primary" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />

          <span className="text-sm font-medium text-muted-foreground">
            Members only
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-bold">
          Save your favorite templates
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Subscribe to Smart Point to add templates to your
          favorites and keep them organized in one place.
        </p>

        <button
          type="button"
          onClick={handleSubscribe}
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" />
          Subscribe to Smart Point
        </button>

        <p className="mt-4 text-xs text-muted-foreground">
          You will be redirected to Whop to complete your
          subscription.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   FAVORITES PAGE
   ========================================================= */

function FavoritesPage() {
  const user = useWhopUser();

  const queryClient = useQueryClient();

  const [preview, setPreview] =
    useState<Template | null>(null);

  /*
   * IMPORTANT
   *
   * app-shell.tsx currently provides a local fallback:
   * "whop-preview-user"
   *
   * We treat that value as an external visitor here.
   *
   * A real Whop user has another id coming from
   * getWhopIdentity().
   */
  const isExternalVisitor =
    !user.id ||
    user.id === "whop-preview-user";

  /*
   * Do not query favorites for an external visitor.
   */
  const favorites = useQuery({
    ...favoritesQuery(user.id),
    enabled: !isExternalVisitor,
  });

  /* =======================================================
     SUBSCRIPTION CHECK
     ======================================================= */

  function handleSubscribe() {
    window.location.href = WHOP_CHECKOUT_URL;
  }

  /* =======================================================
     REMOVE FAVORITE
     ======================================================= */

  async function handleToggleFavorite(
    template: Template,
  ) {
    /*
     * External visitor:
     * never modify Supabase favorites.
     */
    if (isExternalVisitor) {
      toast.info(
        "Abonnez-vous à Smart Point pour ajouter des templates à vos favoris.",
      );

      return;
    }

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

  /* =======================================================
     SECURE DOWNLOAD
     ======================================================= */

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

      /*
       * External visitor:
       *
       * /api/download returns JSON telling the frontend
       * to open the Whop checkout.
       */
      if (
        response.status === 401
      ) {
        try {
          const data =
            await response.json();

          if (
            data?.requires_checkout &&
            typeof data.checkout_url ===
              "string"
          ) {
            window.location.href =
              data.checkout_url;

            return;
          }
        } catch {
          // Continue with normal error handling.
        }
      }

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
     EXTERNAL VISITOR
     ======================================================= */

  if (isExternalVisitor) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <header>
          <h1 className="text-2xl font-bold">
            Favorites
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Save your favorite templates.
          </p>
        </header>

        <SubscriptionRequired />
      </div>
    );
  }

  /* =======================================================
     AUTHENTICATED WHOP USER
     ======================================================= */

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-bold">
          Favorites
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {favorites.data?.length ?? 0} saved
          template(s).
        </p>
      </header>

      {favorites.isPending ? (
        <FavoritesSkeleton />
      ) : favorites.isError ? (
        <div className="panel p-8 text-center">
          <h2 className="font-semibold">
            Impossible de charger les favoris.
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez la connexion à Supabase et
            l'identifiant utilisateur utilisé.
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
      ) : (
        (favorites.data ?? []).length === 0 ? (
          <div className="panel p-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-muted-foreground" />

            <h2 className="mt-4 font-semibold">
              Aucun favori pour le moment
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Sélectionnez le cœur d'un template
              pour l'enregistrer ici.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {(favorites.data ?? []).map(
              ({ template }) => {
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
        )
      )}

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