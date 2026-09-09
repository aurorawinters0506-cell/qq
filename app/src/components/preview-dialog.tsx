import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { previewFor, type Template } from "@/lib/catalog";

export function PreviewDialog({
  template,
  onOpenChange,
  onDownload,
}: {
  template: Template | null;
  onOpenChange: (open: boolean) => void;
  onDownload: (template: Template, format: "pdf" | "pptx") => void;
}) {
  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-border bg-popover">
        {template && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{template.title}</DialogTitle>
              <DialogDescription>
                {template.code} · {template.slides} slides · PDF & PPTX formats
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((offset) => (
                <img
                  key={offset}
                  src={previewFor(template.preview_variant + offset)}
                  alt={`Slide ${offset + 1} from the ${template.title} template`}
                  loading="lazy"
                  width={768}
                  height={512}
                  className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
                />
              ))}
            </div>

            <p className="text-sm text-muted-foreground">{template.description}</p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => onDownload(template, "pdf")}
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button className="gap-2" onClick={() => onDownload(template, "pptx")}>
                <Download className="h-4 w-4" /> Download PPTX
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
