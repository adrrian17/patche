import { Badge } from "@patche/ui/components/badge";
import { Button } from "@patche/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@patche/ui/components/dialog";
import { Input } from "@patche/ui/components/input";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import {
  GripVerticalIcon,
  ImageIcon,
  ImagePlusIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { getAdminProduct } from "@/functions/admin-products";
import {
  deleteProductMedia,
  reorderProductMedia,
  updateProductMediaAlt,
} from "@/functions/catalog";
import { errorMessage } from "@/lib/errors";
import { formatFileSize } from "@/lib/format";

type ProductData = Awaited<ReturnType<typeof getAdminProduct>>;
type ProductMedia = ProductData["media"][number];

interface PendingUpload {
  alt: string;
  file: File;
  id: string;
  previewUrl: string;
}

const acceptedMediaTypes = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// The grip button moves its image with the arrow keys, mirroring drag and drop.
const keyboardOffsets = new Map([
  ["ArrowDown", 1],
  ["ArrowLeft", -1],
  ["ArrowRight", 1],
  ["ArrowUp", -1],
]);

function productQueryKey(productId: string) {
  return ["admin", "products", productId];
}

function uploadButtonLabel(count: number, isUploading: boolean) {
  if (isUploading) {
    return "Subiendo…";
  }
  if (count === 1) {
    return "Subir 1 imagen";
  }
  return `Subir ${count} imágenes`;
}

async function saveMediaOrder(
  queryClient: QueryClient,
  productId: string,
  reordered: ProductMedia[]
) {
  const queryKey = productQueryKey(productId);
  queryClient.setQueryData<ProductData>(
    queryKey,
    (current) => current && { ...current, media: reordered }
  );
  try {
    await reorderProductMedia({
      data: { ids: reordered.map(({ id }) => id), productId },
    });
  } catch (error) {
    toast.error(
      errorMessage(
        error instanceof Error ? error : null,
        "No se pudo guardar el orden"
      )
    );
  } finally {
    await queryClient.invalidateQueries({ queryKey });
  }
}

async function saveMediaAlt(
  queryClient: QueryClient,
  productId: string,
  item: ProductMedia,
  alt: string
) {
  if (alt === item.alt) {
    return;
  }
  const queryKey = productQueryKey(productId);
  queryClient.setQueryData<ProductData>(
    queryKey,
    (current) =>
      current && {
        ...current,
        media: current.media.map((media) =>
          media.id === item.id ? { ...media, alt } : media
        ),
      }
  );
  try {
    await updateProductMediaAlt({ data: { alt, id: item.id } });
  } catch (error) {
    toast.error(
      errorMessage(
        error instanceof Error ? error : null,
        "No se pudo guardar el texto alternativo"
      )
    );
  } finally {
    await queryClient.invalidateQueries({ queryKey });
  }
}

async function deleteMedia(
  queryClient: QueryClient,
  productId: string,
  id: string
) {
  const queryKey = productQueryKey(productId);
  try {
    await deleteProductMedia({ data: { id } });
    toast.success("Imagen eliminada");
  } catch (error) {
    toast.error(
      errorMessage(
        error instanceof Error ? error : null,
        "No se pudo eliminar la imagen"
      )
    );
  }
  await queryClient.invalidateQueries({ queryKey });
}

// Returns how many uploads succeeded before the first failure.
async function uploadMedia(
  productId: string,
  uploads: PendingUpload[],
  onUploaded: (upload: PendingUpload) => void
) {
  let uploaded = 0;
  try {
    for (const upload of uploads) {
      const body = new FormData();
      body.set("alt", upload.alt.trim());
      body.set("file", upload.file);
      body.set("productId", productId);
      // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- the API assigns sort as max + 1, so parallel uploads would collide
      const response = await fetch("/api/admin/media", {
        body,
        method: "POST",
      });
      if (!response.ok) {
        // oxlint-disable-next-line no-await-in-loop -- the loop stops at the first failure
        throw new Error(await response.text());
      }
      onUploaded(upload);
      uploaded += 1;
    }
  } catch (error) {
    toast.error(
      errorMessage(
        error instanceof Error ? error : null,
        "No se pudo subir la imagen"
      )
    );
  }
  return uploaded;
}

function MediaUploadDialog({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function addFiles(files: FileList | null) {
    const selected = [...(files ?? [])];
    const accepted = selected.filter((file) =>
      acceptedMediaTypes.includes(file.type)
    );
    if (accepted.length < selected.length) {
      toast.error("Solo se aceptan imágenes AVIF, GIF, JPEG, PNG o WebP");
    }
    setUploads((current) => [
      ...current,
      ...accepted.map((file) => ({
        alt: "",
        file,
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeUpload(upload: PendingUpload) {
    URL.revokeObjectURL(upload.previewUrl);
    setUploads((current) => current.filter(({ id }) => id !== upload.id));
  }

  function changeOpen(nextOpen: boolean) {
    if (isUploading) {
      return;
    }
    if (!nextOpen) {
      for (const upload of uploads) {
        URL.revokeObjectURL(upload.previewUrl);
      }
      setUploads([]);
    }
    setOpen(nextOpen);
  }

  function changeAlt(id: string, alt: string) {
    setUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, alt } : item))
    );
  }

  async function uploadAll() {
    setIsUploading(true);
    const uploaded = await uploadMedia(productId, uploads, removeUpload);
    setIsUploading(false);
    if (uploaded === uploads.length) {
      setOpen(false);
      toast.success(
        uploaded === 1 ? "Imagen añadida" : `${uploaded} imágenes añadidas`
      );
    }
    if (uploaded) {
      await queryClient.invalidateQueries({
        queryKey: productQueryKey(productId),
      });
    }
  }

  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger render={<Button variant="outline" />}>
        <ImagePlusIcon data-icon="inline-start" />
        Añadir imágenes
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir imágenes</DialogTitle>
          <DialogDescription>
            Se añaden al final, en el orden de esta lista.
          </DialogDescription>
        </DialogHeader>
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dropping files is a shortcut for the nested file input */}
        <label
          className={cn(
            "focus-within:ring-ring/50 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center transition-colors focus-within:ring-3",
            isDragActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"
          )}
          onDragLeave={(event) => {
            if (
              !(
                event.relatedTarget instanceof Node &&
                event.currentTarget.contains(event.relatedTarget)
              )
            ) {
              setIsDragActive(false);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <UploadIcon aria-hidden="true" className="text-primary size-6" />
          <span className="font-medium">
            Arrastra imágenes aquí o haz clic para elegirlas
          </span>
          <span className="text-muted-foreground text-xs">
            AVIF, GIF, JPEG, PNG o WebP. Hasta 10 MB cada una.
          </span>
          <input
            accept={acceptedMediaTypes.join(",")}
            aria-label="Seleccionar imágenes"
            className="sr-only"
            disabled={isUploading}
            multiple
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        {uploads.length ? (
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {uploads.map((upload) => (
              <li className="flex items-center gap-3" key={upload.id}>
                <img
                  alt=""
                  className="bg-muted size-12 shrink-0 rounded-lg border object-cover"
                  src={upload.previewUrl}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-muted-foreground truncate text-xs">
                    {upload.file.name} · {formatFileSize(upload.file.size)}
                  </span>
                  <Input
                    aria-label={`Texto alternativo de ${upload.file.name}`}
                    disabled={isUploading}
                    onChange={(event) =>
                      changeAlt(upload.id, event.target.value)
                    }
                    placeholder="Texto alternativo"
                    value={upload.alt}
                  />
                </div>
                <Button
                  aria-label={`Quitar ${upload.file.name}`}
                  disabled={isUploading}
                  onClick={() => removeUpload(upload)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <DialogFooter>
          <DialogClose
            disabled={isUploading}
            render={<Button variant="outline" />}
          >
            Cancelar
          </DialogClose>
          <Button disabled={isUploading || !uploads.length} onClick={uploadAll}>
            <UploadIcon data-icon="inline-start" />
            {uploadButtonLabel(uploads.length, isUploading)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMediaDialog({
  item,
  label,
  productId,
}: {
  item: ProductMedia;
  label: string;
  productId: string;
}) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  async function remove() {
    setIsDeleting(true);
    await deleteMedia(queryClient, productId, item.id);
    setIsDeleting(false);
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            aria-label={`Eliminar ${label}`}
            className="text-destructive absolute top-2 right-2 bg-red-100 shadow-sm hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900"
            size="icon-xs"
            variant="destructive"
          />
        }
      >
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>¿Eliminar imagen?</DialogTitle>
          <DialogDescription>
            Se borra del producto y del almacenamiento. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <img
          alt={item.alt}
          className="bg-muted mx-auto size-32 rounded-lg border object-cover"
          src={item.url}
        />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button disabled={isDeleting} onClick={remove} variant="destructive">
            {isDeleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MediaManager({
  media,
  productId,
}: {
  media: ProductMedia[];
  productId: string;
}) {
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function move(from: number, to: number) {
    const item = media[from];
    if (!item || from === to || to < 0 || to >= media.length) {
      return;
    }
    const reordered = [...media];
    reordered.splice(from, 1);
    reordered.splice(to, 0, item);
    saveMediaOrder(queryClient, productId, reordered);
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ImageIcon aria-hidden="true" className="text-primary size-4" />
          Imágenes
        </CardTitle>
        <CardDescription>
          La primera imagen es la principal. Arrastra para cambiar el orden y
          edita el texto alternativo debajo de cada una.
        </CardDescription>
        <CardAction>
          <MediaUploadDialog productId={productId} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {media.length ? (
          <ul
            aria-label="Imágenes del producto"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {media.map((item, index) => {
              const label = item.alt || `Imagen ${index + 1}`;
              return (
                // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drag is the pointer path; the grip button reorders by keyboard
                <li
                  className={cn(
                    "bg-muted relative flex cursor-grab flex-col overflow-hidden rounded-xl border shadow-sm active:cursor-grabbing",
                    draggingId === item.id && "opacity-50"
                  )}
                  draggable
                  key={item.id}
                  onDragEnd={() => setDraggingId(null)}
                  onDragOver={(event) => {
                    if (draggingId) {
                      event.preventDefault();
                    }
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", item.id);
                    setDraggingId(item.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = media.findIndex(({ id }) => id === draggingId);
                    setDraggingId(null);
                    move(from, index);
                  }}
                >
                  <img
                    alt={item.alt}
                    className="aspect-square w-full object-cover"
                    draggable={false}
                    src={item.url}
                  />
                  <DeleteMediaDialog
                    item={item}
                    label={label}
                    productId={productId}
                  />
                  {index === 0 ? (
                    <Badge className="absolute top-2 left-2">
                      <StarIcon data-icon="inline-start" />
                      Principal
                    </Badge>
                  ) : null}
                  <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 text-xs">
                    <button
                      aria-label={`Reordenar ${label}, posición ${index + 1} de ${media.length}`}
                      className="focus-visible:ring-ring/50 -m-0.5 shrink-0 cursor-grab rounded p-0.5 outline-none focus-visible:ring-3"
                      onKeyDown={(event) => {
                        const offset = keyboardOffsets.get(event.key);
                        if (offset) {
                          event.preventDefault();
                          move(index, index + offset);
                        }
                      }}
                      type="button"
                    >
                      <GripVerticalIcon
                        aria-hidden="true"
                        className="size-3.5"
                      />
                    </button>
                    <input
                      aria-label={`Texto alternativo de ${label}`}
                      className="placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-ring/50 hover:bg-background/60 min-w-0 flex-1 truncate rounded bg-transparent px-1 py-0.5 outline-none focus-visible:ring-3"
                      defaultValue={item.alt}
                      draggable={false}
                      // Remount after a save so the field shows the stored value.
                      key={item.alt}
                      onBlur={(event) =>
                        saveMediaAlt(
                          queryClient,
                          productId,
                          item,
                          event.target.value.trim()
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          saveMediaAlt(
                            queryClient,
                            productId,
                            item,
                            event.currentTarget.value.trim()
                          );
                        }
                      }}
                      placeholder="Añadir texto alternativo"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Este producto todavía no tiene imágenes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
