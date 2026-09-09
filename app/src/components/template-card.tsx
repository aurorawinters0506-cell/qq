import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getFileUrl,
  previewFor,
  recordDownload,
  toggleFavorite,
  type Category,
  type Template,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Props = {
  template: Template;
  category?: Category | undefined;
  userId: string;
  isFavorite: boolean;
  onPreview: (template: Template) => void;
};

export function TemplateCard({
  template,
  category,
  userId,
  isFavorite,
  onPreview,
}: Props) {
  const queryClient = useQueryClient();
  const [busyFormat, setBusyFormat] = useState<string | null>(null);

  const favMutation = useMutation({
    mutationFn: () => toggleFavorite(userId, template.id, isFavorite),
    onSuccess: (nowFavorite) => {
      queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
      toast.success(nowFavorite ? "Added to favorites" : "Removed from favorites");
    },
    onError: () => toast.error("This action is unavailable right now"),
  });

  async function handleDownload(format: "pdf" | "pptx") {
    setBusyFormat(format);
    try {
      const path = format === "pdf" ? template.pdf_path : template.pptx_path;
      const url = path ? await getFileUrl(path) : null;
      await recordDownload(userId, template.id, format);
      queryClient.invalidateQueries({ queryKey: ["downloads", userId] });
      if (url) {
        window.open(url, "_blank", "noopener");
        toast.success(`${format.toUpperCase()} download started`);
      } else {
        toast.info(
          `${format.toUpperCase()} file has not been added to the library yet`,
        );
      }
    } catch {
      toast.error("Download unavailable");
    } finally {
      setBusyFormat(null);
    }
  }

  return (
    <article className="template-card-3d group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-[transform,border-color,box-shadow] hover:border-ring/60">
      <div className="relative m-2.5 overflow-hidden rounded-lg">
        <img
          src={previewFor(template.preview_variant)}
          alt={`Preview of the ${template.title} template`}
          loading="lazy"
          width={768}
          height={512}
          className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/70 via-primary/10 to-transparent" />
        <span className="absolute left-3 top-3 rounded-md bg-background/85 px-2 py-1 text-[11px] font-semibold tracking-wide text-foreground">
          {template.code}
        </span>
        <h3 className="absolute bottom-4 left-3 max-w-[75%] text-lg font-bold leading-tight text-primary-foreground">
          {template.title}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          onClick={() => favMutation.mutate()}
          className="absolute right-3 top-3 h-8 w-8 rounded-full bg-background/70 backdrop-blur hover:bg-background"
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isFavorite ? "fill-destructive text-destructive" : "text-foreground",
            )}
          />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        <div>
          <p className="text-sm font-semibold">{template.title}</p>
          <span className="mt-2 inline-block rounded-md bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
            {category?.name ?? "Template"} · {template.slides} slides
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <FormatButton
            label="PDF"
            tone="pdf"
            busy={busyFormat === "pdf"}
            onClick={() => handleDownload("pdf")}
          />
          <FormatButton
            label="PPTX"
            tone="pptx"
            busy={busyFormat === "pptx"}
            onClick={() => handleDownload("pptx")}
          />
          <div className="ml-auto flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => onPreview(template)}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => handleDownload("pptx")}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function FormatButton({
  label,
  tone,
  busy,
  onClick,
}: {
  label: string;
  tone: "pdf" | "pptx";
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onClick}
      className="h-7 gap-1.5 px-2 text-[11px]"
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded-sm text-[7px] font-bold text-primary-foreground",
          tone === "pdf" ? "bg-pdf" : "bg-pptx",
        )}
      >
        {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : tone === "pdf" ? "A" : "P"}
      </span>
      {label}
    </Button>
  );
}
