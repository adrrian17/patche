import { Button } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
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
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminProducts } from "@/functions/admin-products";
import { createProduct } from "@/functions/catalog";
import { listCategories } from "@/functions/categories";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const products = useQuery({
    queryFn: () => listAdminProducts(),
    queryKey: ["admin", "products"],
  });
  const categories = useQuery({
    queryFn: () => listCategories(),
    queryKey: ["admin", "categories"],
  });
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
    <>
      <AdminPageHeader
        description="Productos físicos y digitales, sus variantes y archivos."
        eyebrow="Catálogo"
        title="Productos"
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Catálogo</CardTitle>
            <CardDescription>
              {products.data?.length ?? 0} productos registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {products.data?.length ? (
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
                  {products.data.map((item) => (
                    <TableRow key={item.id}>
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
                        <Button
                          render={
                            <Link
                              params={{ productId: item.id }}
                              to="/admin/products/$productId"
                            />
                          }
                          size="icon-sm"
                          variant="ghost"
                        >
                          <ArrowRightIcon />
                          <span className="sr-only">Editar {item.name}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Aún no hay productos</EmptyTitle>
                  <EmptyDescription>
                    Usa el formulario para crear el primero.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Nuevo producto</CardTitle>
            <CardDescription>Stripe se sincroniza al guardar.</CardDescription>
          </CardHeader>
          <CardContent>
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
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
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
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
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
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
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
                            {categories.data?.map((item) => (
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
                      <FieldLabel>Estado inicial</FieldLabel>
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}
