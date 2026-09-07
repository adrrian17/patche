import { Button } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@patche/ui/components/field";
import { Input } from "@patche/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@patche/ui/components/select";
import { Separator } from "@patche/ui/components/separator";
import { Textarea } from "@patche/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ImagePlusIcon,
  PlusIcon,
  SaveIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminProduct } from "@/functions/admin-products";
import {
  archiveProduct,
  archiveVariant,
  changeVariantPrice,
  createVariant,
  updateProduct,
  updateVariant,
} from "@/functions/catalog";
import { listCategories } from "@/functions/categories";
import { confirmDigitalUpload } from "@/functions/confirm-digital-upload";
import { createDigitalUploadUrl } from "@/functions/create-digital-upload-url";
import { errorMessage } from "@/lib/errors";
import { formatFileSize, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/products/$productId")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const product = useQuery({
    queryFn: () => getAdminProduct({ data: { id: productId } }),
    queryKey: ["admin", "products", productId],
  });
  const categories = useQuery({
    queryFn: () => listCategories(),
    queryKey: ["admin", "categories"],
  });
  if (!product.data) {
    return <p className="text-muted-foreground text-sm">Cargando producto…</p>;
  }
  return (
    <>
      <AdminPageHeader
        actions={
          <Button render={<Link to="/admin/products" />} variant="outline">
            <ArrowLeftIcon data-icon="inline-start" />
            Catálogo
          </Button>
        }
        description="Edita la ficha, imágenes, variantes, precios y archivos digitales."
        eyebrow="Producto"
        title={product.data.product.name}
      />
      <ProductBasics categories={categories.data ?? []} data={product.data} />
      <MediaManager data={product.data} />
      <VariantManager data={product.data} />
    </>
  );
}

type ProductData = Awaited<ReturnType<typeof getAdminProduct>>;

interface MediaFormValues {
  alt: string;
  file: File | null;
}

interface NewVariantValues {
  kind: "digital" | "physical";
  lowStockThreshold: number;
  name: string;
  priceAmount: number;
  sku: string;
}

const mediaFormDefaults: MediaFormValues = { alt: "", file: null };
const newVariantDefaults: NewVariantValues = {
  kind: "physical",
  lowStockThreshold: 5,
  name: "",
  priceAmount: 0,
  sku: "",
};

function ProductBasics({
  categories,
  data,
}: {
  categories: { id: string; name: string }[];
  data: ProductData;
}) {
  const queryClient = useQueryClient();
  const { product } = data;
  const initialStatus: "active" | "draft" =
    product.status === "active" ? "active" : "draft";
  const form = useForm({
    defaultValues: {
      categoryId: product.categoryId ?? "none",
      description: product.description,
      name: product.name,
      slug: product.slug,
      status: initialStatus,
    },
    onSubmit: async ({ value }) => {
      try {
        await updateProduct({
          data: {
            ...value,
            categoryId: value.categoryId === "none" ? null : value.categoryId,
            id: product.id,
          },
        });
        await queryClient.invalidateQueries({
          queryKey: ["admin", "products"],
        });
        toast.success("Producto actualizado");
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo actualizar el producto"
          )
        );
      }
    },
  });
  async function archive() {
    try {
      await archiveProduct({ data: { id: product.id } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Producto archivado");
    } catch (error) {
      toast.error(
        errorMessage(
          error instanceof Error ? error : null,
          "No se pudo archivar"
        )
      );
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-xl">
          Ficha <StatusBadge status={product.status} />
        </CardTitle>
        <CardDescription>
          Los cambios de nombre y estado también se envían a Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="product-basics"
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <form.Field name="name">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="slug">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
                  <Input
                    className="font-mono"
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="categoryId">
              {(field) => (
                <Field>
                  <FieldLabel>Categoría</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(value ?? "none")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Sin categoría</SelectItem>
                        {categories.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="status">
              {(field) => (
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(
                        value === "active" ? "active" : "draft"
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="description">
              {(field) => (
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor={field.name}>Descripción</FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-between">
        <Button onClick={archive} variant="destructive">
          <ArchiveIcon data-icon="inline-start" />
          Archivar
        </Button>
        <Button form="product-basics" type="submit">
          <SaveIcon data-icon="inline-start" />
          Guardar ficha
        </Button>
      </CardFooter>
    </Card>
  );
}

function MediaManager({ data }: { data: ProductData }) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: mediaFormDefaults,
    onSubmit: async ({ value }) => {
      if (!value.file) {
        toast.error("Selecciona una imagen");
        return;
      }
      const body = new FormData();
      body.set("alt", value.alt);
      body.set("file", value.file);
      body.set("productId", data.product.id);
      try {
        const response = await fetch("/api/admin/media", {
          body,
          method: "POST",
        });
        await requireMediaUpload(response);
        form.reset();
        await queryClient.invalidateQueries({
          queryKey: ["admin", "products", data.product.id],
        });
        toast.success("Imagen añadida");
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo subir la imagen"
          )
        );
      }
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-xl">Imágenes</CardTitle>
        <CardDescription>
          AVIF, GIF, JPEG, PNG o WebP. Se publican desde R2.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {data.media.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.media.map((item) => (
              <figure className="bg-muted overflow-hidden border" key={item.id}>
                <img
                  alt={item.alt}
                  className="aspect-square w-full object-cover"
                  src={item.url}
                />
                <figcaption className="text-muted-foreground truncate px-2 py-1.5 text-xs">
                  {item.alt || "Sin texto alternativo"}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Este producto todavía no tiene imágenes.
          </p>
        )}
        <Separator />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <form.Field name="file">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="media-file">Archivo</FieldLabel>
                  <Input
                    accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                    id="media-file"
                    onChange={(event) =>
                      field.handleChange(event.target.files?.[0] ?? null)
                    }
                    type="file"
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="alt">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Texto alternativo
                  </FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <Button type="submit">
              <ImagePlusIcon data-icon="inline-start" />
              Subir
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function VariantManager({ data }: { data: ProductData }) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: newVariantDefaults,
    onSubmit: async ({ value }) => {
      try {
        await createVariant({ data: { ...value, productId: data.product.id } });
        form.reset();
        await queryClient.invalidateQueries({
          queryKey: ["admin", "products", data.product.id],
        });
        toast.success("Variante creada");
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo crear la variante"
          )
        );
      }
    },
  });
  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-2xl">Variantes</h2>
        <p className="text-muted-foreground text-sm">
          Cada precio es un Price inmutable en Stripe.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.variants.map((item) => (
          <VariantCard item={item} key={item.id} productId={data.product.id} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Nueva variante</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <form.Field name="name">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="variant-name">Nombre</FieldLabel>
                    <Input
                      id="variant-name"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="sku">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="variant-sku">SKU</FieldLabel>
                    <Input
                      id="variant-sku"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="kind">
                {(field) => (
                  <Field>
                    <FieldLabel>Tipo</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(
                          value === "digital" ? "digital" : "physical"
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="physical">Físico</SelectItem>
                          <SelectItem value="digital">Digital</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>
              <form.Field name="priceAmount">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="variant-price">
                      Precio en centavos
                    </FieldLabel>
                    <Input
                      id="variant-price"
                      min="0"
                      type="number"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.valueAsNumber)
                      }
                    />
                  </Field>
                )}
              </form.Field>
              <Button type="submit">
                <PlusIcon data-icon="inline-start" />
                Crear variante
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

type VariantData = ProductData["variants"][number];

function VariantCard({
  item,
  productId,
}: {
  item: VariantData;
  productId: string;
}) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      lowStockThreshold: item.lowStockThreshold,
      name: item.name,
      priceAmount: item.priceAmount,
      sku: item.sku,
    },
    onSubmit: async ({ value }) => {
      try {
        await updateVariant({
          data: {
            id: item.id,
            lowStockThreshold: value.lowStockThreshold,
            name: value.name,
            sku: value.sku,
          },
        });
        if (value.priceAmount !== item.priceAmount) {
          await changeVariantPrice({
            data: { id: item.id, priceAmount: value.priceAmount },
          });
        }
        await queryClient.invalidateQueries({
          queryKey: ["admin", "products", productId],
        });
        toast.success("Variante actualizada");
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo actualizar la variante"
          )
        );
      }
    },
  });
  async function archive() {
    try {
      await archiveVariant({ data: { id: item.id } });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "products", productId],
      });
      toast.success("Variante archivada");
    } catch (error) {
      toast.error(
        errorMessage(
          error instanceof Error ? error : null,
          "No se pudo archivar"
        )
      );
    }
  }
  async function uploadDigital(file: File) {
    try {
      const upload = await createDigitalUploadUrl({
        data: {
          contentType: file.type || "application/octet-stream",
          fileName: file.name,
          size: file.size,
          variantId: item.id,
        },
      });
      const response = await fetch(upload.url, {
        body: file,
        headers: { "Content-Type": upload.contentType },
        method: "PUT",
      });
      requireDigitalUpload(response);
      await confirmDigitalUpload({
        data: {
          contentType: upload.contentType,
          fileName: upload.fileName,
          key: upload.key,
          size: upload.size,
          variantId: item.id,
        },
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "products", productId],
      });
      toast.success("Archivo digital guardado");
    } catch (error) {
      toast.error(
        errorMessage(
          error instanceof Error ? error : null,
          "No se pudo subir el archivo"
        )
      );
    }
  }
  return (
    <Card className={item.archivedAt ? "opacity-60" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{item.name}</span>
          <StatusBadge status={item.archivedAt ? "archived" : "active"} />
        </CardTitle>
        <CardDescription>
          {item.kind === "digital" ? "Digital" : "Físico"} ·{" "}
          {formatMoney(item.priceAmount)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id={`variant-${item.id}`}
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <form.Field name="name">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={`${item.id}-name`}>Nombre</FieldLabel>
                  <Input
                    id={`${item.id}-name`}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="sku">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={`${item.id}-sku`}>SKU</FieldLabel>
                  <Input
                    id={`${item.id}-sku`}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="priceAmount">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={`${item.id}-price`}>
                    Precio en centavos
                  </FieldLabel>
                  <Input
                    id={`${item.id}-price`}
                    min="0"
                    type="number"
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(event.target.valueAsNumber)
                    }
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="lowStockThreshold">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={`${item.id}-stock`}>
                    Umbral de stock
                  </FieldLabel>
                  <Input
                    disabled={item.kind === "digital"}
                    id={`${item.id}-stock`}
                    min="0"
                    type="number"
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(event.target.valueAsNumber)
                    }
                  />
                </Field>
              )}
            </form.Field>
            {item.kind === "digital" ? (
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor={`${item.id}-file`}>
                  Archivo digital
                </FieldLabel>
                <Input
                  disabled={Boolean(item.archivedAt)}
                  id={`${item.id}-file`}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      await uploadDigital(file);
                    }
                  }}
                  type="file"
                />
                {item.digitalFileName && item.digitalFileSize ? (
                  <FieldDescription>
                    {item.digitalFileName} ·{" "}
                    {formatFileSize(item.digitalFileSize)}
                  </FieldDescription>
                ) : (
                  <FieldDescription>
                    Máximo 500 MB. La carga va directo a R2.
                  </FieldDescription>
                )}
              </Field>
            ) : null}
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-between">
        <Button
          disabled={Boolean(item.archivedAt)}
          onClick={archive}
          size="sm"
          variant="destructive"
        >
          <ArchiveIcon data-icon="inline-start" />
          Archivar
        </Button>
        <Button
          disabled={Boolean(item.archivedAt)}
          form={`variant-${item.id}`}
          size="sm"
          type="submit"
        >
          <SaveIcon data-icon="inline-start" />
          Guardar
        </Button>
      </CardFooter>
    </Card>
  );
}

async function requireMediaUpload(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function requireDigitalUpload(response: Response): void {
  if (!response.ok) {
    throw new Error("R2 rechazó el archivo");
  }
}
