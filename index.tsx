import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  FileText,
  LayoutGrid,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import heroVideo from "@/assets/smart-point-hero.mp4";
import { useWhopUser } from "@/components/app-shell";
import { CategoryIcon } from "@/components/category-icon";
import { PreviewDialog } from "@/components/preview-dialog";
import { TemplateCard } from "@/components/template-card";
import { Button } from "@/components/ui/button";
import {
  categoriesQuery,
  categoryCountsQuery,
  favoritesQuery,
  recordDownload,
  templatesQuery,
  toggleFavorite,
  type SortKey,
  type Template,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Smart Point — Premium PowerPoint Templates",
      },
      {
        name: "description",
        content:
          "Access professional PowerPoint templates with search, categories, previews, PDF and PPTX downloads.",
      },
      {
        property: "og:title",
        content:
          "Smart Point — Premium PowerPoint Templates",
      },
      {
        property: "og:description",
        content:
          "Professional PowerPoint templates organized by category in PDF and PPTX.",
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

  component: Dashboard,
});

const SORTS: {
  key: SortKey;
  label: string;
}[] = [
  {
    key: "recent",
    label: "Newest",
  },
  {
    key: "name",
    label: "Name (A–Z)",
  },
  {
    key: "slides",
    label: "Slide count",
  },
];

const CATEGORY_TONES = [
  "category-blue",
  "category-violet",
  "category-orange",
  "category-green",
  "category-pink",
  "category-magenta",
  "category-cyan",
  "category-amber",
  "category-indigo",
  "category-teal",
] as const;

function Dashboard() {
  const user = useWhopUser();
  const queryClient = useQueryClient();

  const [categoryId, setCategoryId] = useState<
    string | undefined
  >();

  const [globalSearch, setGlobalSearch] =
    useState("");

  const [localSearch, setLocalSearch] =
    useState("");

  const [sort, setSort] =
    useState<SortKey>("recent");

  const [preview, setPreview] =
    useState<Template | null>(null);

  const categories = useQuery(
    categoriesQuery(),
  );

  const counts = useQuery(
    categoryCountsQuery(),
  );

  const favorites = useQuery(
    favoritesQuery(user.id),
  );

  /*
   * Global search event coming from AppShell.
   */
  useEffect(() => {
    function handler(event: Event) {
      setGlobalSearch(
        (event as CustomEvent<string>)
          .detail ?? "",
      );
    }

    window.addEventListener(
      "smartpoint:search",
      handler,
    );

    return () => {
      window.removeEventListener(
        "smartpoint:search",
        handler,
      );
    };
  }, []);

  /*
   * First category becomes active automatically.
   */
  const activeCategoryId =
    categoryId ??
    categories.data?.[0]?.id ??
    undefined;

  /*
   * Global search searches the complete library.
   * Local search searches inside the selected category.
   */
  const globalSearchValue =
    globalSearch.trim();

  const localSearchValue =
    localSearch.trim();

  const isSearching =
    globalSearchValue.length > 0;

  const search = isSearching
    ? globalSearchValue
    : localSearchValue;

  const templates = useQuery(
    templatesQuery({
      categoryId: isSearching
        ? undefined
        : activeCategoryId,
      search,
      sort,
    }),
  );

  const activeCategory =
    categories.data?.find(
      (category) =>
        category.id ===
        activeCategoryId,
    );

  /*
   * Favorite IDs for fast card rendering.
   */
  const favoriteIds = useMemo(
    () =>
      new Set(
        (favorites.data ?? []).map(
          (favorite) =>
            favorite.template_id,
        ),
      ),
    [favorites.data],
  );

  /*
   * Total number of active templates.
   */
  const totalTemplates = useMemo(
    () =>
      Object.values(
        counts.data ?? {},
      ).reduce(
        (total, count) =>
          total + count,
        0,
      ),
    [counts.data],
  );

  /*
   * Toggle favorite.
   */
  async function handleToggleFavorite(
    template: Template,
  ) {
    const templateId =
      template.id ??
      template.template_id;

    const currentlyFavorite =
      favoriteIds.has(templateId);

    try {
      await toggleFavorite(
        user.id,
        templateId,
        currentlyFavorite,
      );

      await queryClient.invalidateQueries({
        queryKey: [
          "favorites",
          user.id,
        ],
      });

      toast.success(
        currentlyFavorite
          ? "Removed from favorites"
          : "Added to favorites",
      );
    } catch (error) {
      console.error(
        "[Smart Point] favorite:",
        error,
      );

      toast.error(
        "Unable to update your favorites",
      );
    }
  }

  /*
   * Download handler.
   *
   * IMPORTANT:
   * The file opens immediately.
   * Recording the download history happens afterward.
   * Therefore a Supabase/RLS error cannot block
   * the actual PDF/PPTX download.
   */
  async function handleDownload(
    template: Template,
    format: "pdf" | "pptx",
  ) {
    const templateId =
      template.id ??
      template.template_id;

    const url =
      format === "pdf"
        ? template.pdf_url
        : template.pptx_url;

    /*
     * No file available.
     */
    if (!url) {
      toast.info(
        `${format.toUpperCase()} file has not been added to the library yet`,
      );

      return;
    }

    /*
     * Open the real file immediately.
     */
    window.open(
      url,
      "_blank",
      "noopener,noreferrer",
    );

    /*
     * History is secondary.
     * It must never prevent the download.
     */
    try {
      await recordDownload(
        user.id,
        templateId,
        format,
      );

      await queryClient.invalidateQueries({
        queryKey: [
          "downloads",
          user.id,
        ],
      });
    } catch (error) {
      console.error(
        "[Smart Point] download history:",
        error,
      );

      /*
       * Deliberately no error toast here.
       * The download itself already opened successfully.
       */
    }
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-5">
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="hero-gradient hero-depth relative min-h-[238px] overflow-hidden rounded-lg border border-border sm:min-h-[252px]">
        <video
          src={heroVideo.url}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label="Smart Point presentation showcase"
          className="hero-visual absolute inset-y-0 right-0 hidden h-full w-[58%] object-cover object-center opacity-95 md:block"
        />

        <div className="hero-overlay pointer-events-none absolute inset-0 hidden md:block" />

        <div className="relative max-w-[650px] p-5 sm:p-6 lg:p-7">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />

            Welcome, {user.name}!
          </p>

          <h1 className="mt-2 text-3xl font-extrabold leading-tight lg:text-[2.25rem]">
            Boost your ideas with professional

            <span className="block text-primary">
              PowerPoint templates.
            </span>
          </h1>

          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Explore our professional
            PowerPoint templates designed to
            help you create presentations that
            make an impact.
          </p>

          <ul className="mt-5 flex flex-wrap gap-2">
            <HeroPill
              icon={Sparkles}
              label={`${totalTemplates || 0}+ Templates`}
            />

            <HeroPill
              icon={LayoutGrid}
              label={`${categories.data?.length ?? 0} Categories`}
            />

            <HeroPill
              icon={FileText}
              label="PPTX & PDF Formats"
            />

            <HeroPill
              icon={Clock}
              label="Updated regularly"
            />
          </ul>
        </div>
      </section>

      {/* =====================================================
          CATEGORIES
          ===================================================== */}
      <section aria-labelledby="categories-heading">
        <h2
          id="categories-heading"
          className="text-xl font-bold"
        >
          Categories
        </h2>

        <div className="scrollbar-slim mt-4 grid auto-cols-[116px] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[122px]">
          {(categories.data ?? []).map(
            (category, index) => {
              const active =
                !isSearching &&
                category.id ===
                  activeCategoryId;

              return (
                <Button
                  key={category.id}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setCategoryId(
                      category.id,
                    );

                    setLocalSearch("");
                    setGlobalSearch("");
                  }}
                  className={cn(
                    "category-tile h-[102px] w-full flex-col gap-2 rounded-lg border p-2 text-center text-[11px] font-semibold whitespace-normal",

                    active
                      ? "is-active border-ring bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-ring/60",
                  )}
                >
                  <span
                    className={cn(
                      "category-icon grid h-9 w-9 place-items-center rounded-md",

                      CATEGORY_TONES[
                        index %
                          CATEGORY_TONES.length
                      ],
                    )}
                  >
                    {/*
                     * IMPORTANT:
                     * We use category.name here,
                     * not category.icon.
                     *
                     * CategoryIcon now determines
                     * the correct icon from the
                     * category name.
                     */}
                    <CategoryIcon
                      name={category.name}
                      className="h-5 w-5"
                    />
                  </span>

                  <span className="leading-tight">
                    {category.name}
                  </span>
                </Button>
              );
            },
          )}
        </div>
      </section>

      {/* =====================================================
          TEMPLATE SECTION
          ===================================================== */}
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">
            {isSearching
              ? `Results for “${globalSearchValue}”`
              : activeCategory?.name}
          </h2>

          <span className="rounded-md bg-primary/20 px-2.5 py-1 text-xs text-foreground">
            {templates.data?.length ?? 0}{" "}
            templates available
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* Local category search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={localSearch}
                onChange={(event) =>
                  setLocalSearch(
                    event.target.value,
                  )
                }
                placeholder="Search this category..."
                className="h-10 w-full min-w-[240px] rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              />
            </div>

            {/* Sort */}
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm">
              <span className="text-muted-foreground">
                Sort by:
              </span>

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target
                      .value as SortKey,
                  )
                }
                className="bg-transparent text-sm outline-none"
              >
                {SORTS.map(
                  (option) => (
                    <option
                      key={
                        option.key
                      }
                      value={
                        option.key
                      }
                      className="bg-popover"
                    >
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
        </div>

        {/* =================================================
            LOADING
            ================================================= */}
        {templates.isPending ? (
          <SkeletonGrid />
        ) : /* =================================================
             EMPTY
             ================================================= */ (
          (templates.data ?? [])
            .length === 0
        ) ? (
          <p className="panel mt-5 p-8 text-center text-sm text-muted-foreground">
            No templates match your
            search.
          </p>
        ) : (
          /* ===============================================
             TEMPLATE GRID
             =============================================== */
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {(templates.data ?? []).map(
              (template) => (
                <TemplateCard
                  key={
                    template.id ??
                    template.template_id
                  }
                  template={template}
                  isFavorite={favoriteIds.has(
                    template.id ??
                      template.template_id,
                  )}
                  onToggleFavorite={
                    handleToggleFavorite
                  }
                  onPreview={setPreview}
                  onDownload={
                    handleDownload
                  }
                />
              ),
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          PDF PREVIEW DIALOG
          ===================================================== */}
      <PreviewDialog
        template={preview}
        onOpenChange={(open) => {
          if (!open) {
            setPreview(null);
          }
        }}
        onDownload={handleDownload}
      />
    </div>
  );
}

/* ===========================================================
   HERO PILL
   =========================================================== */

function HeroPill({
  icon: Icon,
  label,
}: {
  icon: typeof Sparkles;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-border bg-surface/80 px-3 py-2 text-xs backdrop-blur">
      <Icon className="h-4 w-4 text-primary" />

      {label}
    </li>
  );
}

/* ===========================================================
   SKELETON GRID
   =========================================================== */

export function SkeletonGrid() {
  return (
    <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({
        length: 8,
      }).map((_, index) => (
        <div
          key={index}
          className="h-[300px] animate-pulse rounded-xl border border-border bg-card"
        />
      ))}
    </div>
  );
}