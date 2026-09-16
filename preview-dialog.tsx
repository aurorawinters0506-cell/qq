import {
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Template } from "@/lib/catalog";

type PreviewDialogProps = {
  template: Template | null;
  onOpenChange: (open: boolean) => void;
  onDownload?: (
    template: Template,
    format: "pdf" | "pptx",
  ) => void;
};

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "";

const PREVIEW_FUNCTION =
  "preview-pdf";

export function PreviewDialog({
  template,
  onOpenChange,
  onDownload,
}: PreviewDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<
    string | null
  >(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadPdf() {
      if (!template) {
        setPdfUrl(null);
        setError(null);
        setLoading(false);
        return;
      }

      const templateId =
        template.id ??
        template.template_id;

      if (!templateId) {
        setPdfUrl(null);
        setError(
          "Impossible d'identifier ce template.",
        );
        setLoading(false);
        return;
      }

      if (!SUPABASE_URL) {
        setPdfUrl(null);
        setError(
          "La configuration Supabase est manquante.",
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPdfUrl(null);

      try {
        const endpoint =
          `${SUPABASE_URL}/functions/v1/${PREVIEW_FUNCTION}` +
          `?template_id=${encodeURIComponent(
            templateId,
          )}`;

        const response = await fetch(
          endpoint,
          {
            method: "GET",
            headers: {
              Accept: "application/pdf",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          let message =
            "Impossible de charger l'aperçu PDF.";

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
                message = data.message;
              } else if (
                typeof data?.error ===
                "string"
              ) {
                message = data.error;
              }
            } else {
              const text =
                await response.text();

              if (text.trim()) {
                message = text.trim();
              }
            }
          } catch {
            // Keep the default error message.
          }

          throw new Error(message);
        }

        const contentType =
          response.headers.get(
            "content-type",
          );

        if (
          contentType &&
          !contentType.includes(
            "application/pdf",
          )
        ) {
          throw new Error(
            "Le serveur n'a pas retourné un fichier PDF valide.",
          );
        }

        const blob =
          await response.blob();

        if (
          blob.size === 0
        ) {
          throw new Error(
            "Le fichier PDF retourné est vide.",
          );
        }

        objectUrl =
          URL.createObjectURL(
            new Blob([blob], {
              type: "application/pdf",
            }),
          );

        if (!cancelled) {
          setPdfUrl(objectUrl);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "[Smart Point] PDF preview error:",
          err,
        );

        setPdfUrl(null);

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger l'aperçu PDF.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl,
        );
      }
    };
  }, [template]);

  function handleOpenChange(
    open: boolean,
  ) {
    if (!open) {
      setPdfUrl(null);
      setError(null);
      setLoading(false);
    }

    onOpenChange(open);
  }

  if (!template) {
    return null;
  }

  const templateName =
    template.name ||
    "Template Smart Point";

  const templateCode =
    template.code ??
    template.template_id ??
    "";

  const hasPdf =
    Boolean(template.pdf_url);

  const hasPptx =
    Boolean(template.pptx_url);

  return (
    <Dialog
      open={Boolean(template)}
      onOpenChange={
        handleOpenChange
      }
    >
      <DialogContent
        className="
          flex
          h-[95vh]
          w-[96vw]
          max-w-7xl
          flex-col
          overflow-hidden
          p-0
        "
      >
        <DialogHeader
          className="
            flex
            shrink-0
            flex-row
            items-center
            justify-between
            gap-4
            border-b
            border-border
            px-5
            py-4
            pr-14
          "
        >
          <div className="min-w-0">
            <DialogTitle
              className="
                truncate
                text-base
                font-semibold
                sm:text-lg
              "
            >
              {templateName}
            </DialogTitle>

            <DialogDescription
              className="
                mt-1
                truncate
                text-xs
                text-muted-foreground
              "
            >
              {templateCode
                ? `Template ${templateCode}`
                : "Aperçu du template"}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div
          className="
            relative
            min-h-0
            flex-1
            overflow-hidden
            bg-muted/30
          "
        >
          {loading && (
            <div
              className="
                absolute
                inset-0
                z-10
                flex
                flex-col
                items-center
                justify-center
                gap-3
                bg-background
              "
            >
              <Loader2
                className="
                  h-8
                  w-8
                  animate-spin
                  text-primary
                "
              />

              <p className="text-sm text-muted-foreground">
                Chargement de l'aperçu...
              </p>
            </div>
          )}

          {error && !loading && (
            <div
              className="
                flex
                h-full
                flex-col
                items-center
                justify-center
                gap-4
                px-6
                text-center
              "
            >
              <div
                className="
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-full
                  bg-destructive/10
                  text-destructive
                "
              >
                <FileText className="h-7 w-7" />
              </div>

              <div className="max-w-md">
                <h3 className="font-semibold">
                  Aperçu indisponible
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  {error}
                </p>
              </div>

              {!hasPdf && (
                <p className="text-xs text-muted-foreground">
                  Aucun fichier PDF n'est actuellement
                  associé à ce template.
                </p>
              )}
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              title={`Aperçu PDF de ${templateName}`}
              className="
                h-full
                w-full
                border-0
                bg-white
              "
            />
          )}
        </div>

        <div
          className="
            flex
            shrink-0
            flex-col
            gap-3
            border-t
            border-border
            bg-background
            px-5
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {templateName}
            </p>

            <p className="text-xs text-muted-foreground">
              Choisissez le format à télécharger
            </p>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 sm:flex-none"
              disabled={
                !hasPdf ||
                !onDownload
              }
              onClick={() =>
                onDownload?.(
                  template,
                  "pdf",
                )
              }
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>

            <Button
              type="button"
              className="flex-1 gap-2 sm:flex-none"
              disabled={
                !hasPptx ||
                !onDownload
              }
              onClick={() =>
                onDownload?.(
                  template,
                  "pptx",
                )
              }
            >
              <Download className="h-4 w-4" />
              PPTX
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}