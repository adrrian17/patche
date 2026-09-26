import { Button, buttonVariants } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@patche/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@patche/ui/components/empty";
import {
  Field,
  FieldError,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@patche/ui/components/table";
import { Textarea } from "@patche/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import {
  ChevronDownIcon,
  ImageIcon,
  NotebookTabsIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/page-header";
import { MediaViewer } from "@/components/admin/product-media";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminProducts } from "@/functions/admin-products";
import { createProduct } from "@/functions/catalog";
import { listCategories } from "@/functions/categories";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/format";
import { productStatusLabels } from "@/lib/labels";

const productSchema = z.object({
  categoryId: z.string(),
  description: z.string().max(10_000),
  name: z.string().trim().min(1, "Escribe un nombre").max(160),
  status: z.enum(["draft", "active"]),
});

interface NewProductValues {
  categoryId: string;
  description: string;
  name: string;
  status: "active" | "draft";
}

const newProductDefaults: NewProductValues = {
  categoryId: "none",
  description: "",
  name: "",
  status: "draft",
};

export const Route = createFileRoute("/admin/products/")({
  component: ProductsPage,
});

function ProductsPage() {
  const products = useQuery({
    queryFn: () => listAdminProducts(),
    queryKey: ["admin", "products"],
  });
  const categories = useQuery({
    queryFn: () => listCategories(),
    queryKey: ["admin", "categories"],
  });
  const productCount = products.data?.length ?? 0;
  const productSummary =
    productCount === 1 ? "producto registrado" : "productos registrados";

  return (
    <>
      <AdminPageHeader
        actions={<NewProductDialog categories={categories.data ?? []} />}
        icon={NotebookTabsIcon}
        title="Productos"
      />
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <PackageIcon aria-hidden="true" className="text-primary size-4" />
            Catálogo
          </CardTitle>
          <CardDescription>
            {productCount} {productSummary}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.isPending && (
            <p className="text-muted-foreground text-sm">Cargando productos…</p>
          )}
          {products.isError && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-destructive text-sm">
                No se pudieron cargar los productos.
              </p>
              <Button
                onClick={async () => await products.refetch()}
                size="sm"
                variant="outline"
              >
                Reintentar
              </Button>
            </div>
          )}
          {products.isSuccess && products.data.length > 0 && (
            <ProductsTable products={products.data} />
          )}
          {products.isSuccess && products.data.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Aún no hay productos</EmptyTitle>
                <EmptyDescription>
                  Usa el botón de arriba para crear el primero.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </>
  );
}

type ProductListItem = Awaited<ReturnType<typeof listAdminProducts>>[number];

function variantSummary(variants: ProductListItem["variants"]) {
  const active = variants.filter(({ archivedAt }) => !archivedAt);
  const count =
    active.length === 1 ? "1 variante" : `${active.length} variantes`;
  if (!active.length) {
    return count;
  }
  const prices = active.map(({ priceAmount }) => priceAmount);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range =
    min === max
      ? formatMoney(min)
      : `${formatMoney(min)} – ${formatMoney(max)}`;
  return `${count} · ${range}`;
}

function ProductThumbnail({ item }: { item: ProductListItem }) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  if (!item.mainImage) {
    return (
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-lg border">
        <ImageIcon aria-hidden="true" className="size-4" />
        <span className="sr-only">Sin imagen</span>
      </div>
    );
  }
  const image = {
    alt: item.mainImage.alt || item.name,
    url: item.mainImage.url,
  };
  return (
    <>
      <button
        aria-label={`Ver en grande: ${image.alt}`}
        className="focus-visible:ring-ring/50 block cursor-zoom-in rounded-lg outline-none focus-visible:ring-3"
        onClick={() => setViewingIndex(0)}
        type="button"
      >
        <img
          alt={item.mainImage.alt}
          className="bg-muted size-12 rounded-lg border object-cover"
          src={item.mainImage.url}
        />
      </button>
      <MediaViewer
        index={viewingIndex}
        media={[image]}
        onIndexChange={setViewingIndex}
      />
    </>
  );
}

function ProductsTable({ products }: { products: ProductListItem[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">
            <span className="sr-only">Imagen</span>
          </TableHead>
          <TableHead>Producto</TableHead>
          <TableHead>Variantes</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead>
            <span className="sr-only">Editar</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((item) => {
          const isExpanded = expandedIds.has(item.id);
          const variantsId = `variants-${item.id}`;
          return (
            <Fragment key={item.id}>
              <TableRow>
                <TableCell>
                  <ProductThumbnail item={item} />
                </TableCell>
                <TableCell>
                  <Link
                    className="font-medium hover:underline"
                    params={{ productId: item.id }}
                    to="/admin/products/$productId"
                  >
                    {item.name}
                  </Link>
                  <span className="text-muted-foreground block font-mono text-xs">
                    /{item.slug}
                  </span>
                </TableCell>
                <TableCell>
                  {item.variants.length ? (
                    <Button
                      aria-controls={variantsId}
                      aria-expanded={isExpanded}
                      onClick={() => toggle(item.id)}
                      className="h-auto px-0 py-0 hover:bg-transparent hover:text-inherit has-data-[icon=inline-end]:pr-0 aria-expanded:bg-transparent aria-expanded:text-inherit dark:hover:bg-transparent"
                      size="sm"
                      variant="ghost"
                    >
                      {variantSummary(item.variants)}
                      <ChevronDownIcon
                        className={cn(
                          "transition-transform",
                          isExpanded && "rotate-180"
                        )}
                        data-icon="inline-end"
                      />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Sin variantes
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Link
                    className={buttonVariants({
                      size: "icon-sm",
                      variant: "ghost",
                    })}
                    params={{ productId: item.id }}
                    to="/admin/products/$productId"
                  >
                    <PencilIcon />
                    <span className="sr-only">Editar {item.name}</span>
                  </Link>
                </TableCell>
              </TableRow>
              {isExpanded ? (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={2} />
                  <TableCell colSpan={4}>
                    <ul
                      aria-label={`Variantes de ${item.name}`}
                      className="flex flex-col divide-y"
                      id={variantsId}
                    >
                      {item.variants.map((entry) => (
                        <li
                          className={cn(
                            "flex items-center gap-3 py-2",
                            entry.archivedAt && "text-muted-foreground"
                          )}
                          key={entry.id}
                        >
                          <span className="font-medium">{entry.name}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {formatMoney(entry.priceAmount)}
                          </span>
                          {entry.archivedAt ? (
                            <StatusBadge status="archived" />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function NewProductDialog({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm({
    defaultValues: newProductDefaults,
    onSubmit: async ({ value }) => {
      try {
        const created = await createProduct({
          data: {
            ...value,
            categoryId: value.categoryId === "none" ? null : value.categoryId,
          },
        });
        await queryClient.invalidateQueries({
          queryKey: ["admin", "products"],
        });
        toast.success("Producto creado");
        setOpen(false);
        form.reset();
        await navigate({
          params: { productId: created.id },
          to: "/admin/products/$productId",
        });
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo crear el producto"
          )
        );
      }
    },
    validators: { onSubmit: productSchema },
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Nuevo producto
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="name">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
                  <Input
                    aria-invalid={field.state.meta.errors.length > 0}
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <FieldError key={error?.message}>
                      {error?.message}
                    </FieldError>
                  ))}
                </Field>
              )}
            </form.Field>
            <form.Field name="description">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Descripción</FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="categoryId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="new-product-category">
                    Categoría
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(value ?? "none")
                    }
                  >
                    <SelectTrigger className="w-full" id="new-product-category">
                      <SelectValue>
                        {(value: string) =>
                          categories.find((item) => item.id === value)?.name ??
                          "Sin categoría"
                        }
                      </SelectValue>
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
                  <FieldLabel htmlFor="new-product-status">
                    Estado inicial
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(
                        value === "active" ? "active" : "draft"
                      )
                    }
                  >
                    <SelectTrigger className="w-full" id="new-product-status">
                      <SelectValue>
                        {(value: keyof typeof productStatusLabels) =>
                          productStatusLabels[value]
                        }
                      </SelectValue>
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
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  <PlusIcon data-icon="inline-start" />
                  {isSubmitting ? "Creando…" : "Crear producto"}
                </Button>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
