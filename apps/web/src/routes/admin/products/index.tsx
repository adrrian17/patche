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
import { ArrowRightIcon, PackageIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminProducts } from "@/functions/admin-products";
import { createProduct } from "@/functions/catalog";
import { listCategories } from "@/functions/categories";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { productStatusLabels } from "@/lib/labels";

const productSchema = z.object({
  categoryId: z.string(),
  description: z.string().max(10_000),
  name: z.string().trim().min(1, "Escribe un nombre").max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Usa minúsculas, números y guiones"),
  status: z.enum(["draft", "active"]),
});

interface NewProductValues {
  categoryId: string;
  description: string;
  name: string;
  slug: string;
  status: "active" | "draft";
}

const newProductDefaults: NewProductValues = {
  categoryId: "none",
  description: "",
  name: "",
  slug: "",
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

function ProductsTable({ products }: { products: ProductListItem[] }) {
  const navigate = useNavigate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead>
            <span className="sr-only">Abrir</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((item) => (
          <TableRow
            className="cursor-pointer"
            key={item.id}
            onClick={() =>
              navigate({
                params: { productId: item.id },
                to: "/admin/products/$productId",
              })
            }
          >
            <TableCell>
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground block font-mono text-xs">
                /{item.slug}
              </span>
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
                onClick={(event) => event.stopPropagation()}
                params={{ productId: item.id }}
                to="/admin/products/$productId"
              >
                <ArrowRightIcon />
                <span className="sr-only">Editar {item.name}</span>
              </Link>
            </TableCell>
          </TableRow>
        ))}
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
            <form.Field name="slug">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
                  <Input
                    aria-invalid={field.state.meta.errors.length > 0}
                    id={field.name}
                    placeholder="agenda-semanal"
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
