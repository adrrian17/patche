import { Button } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@patche/ui/components/field";
import { Input } from "@patche/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@patche/ui/components/table";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/page-header";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/functions/categories";
import { errorMessage } from "@/lib/errors";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Usa minúsculas, números y guiones"),
});

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryFn: () => listCategories(),
    queryKey: ["admin", "categories"],
  });
  const form = useForm({
    defaultValues: { name: "", slug: "" },
    onSubmit: async ({ value }) => {
      try {
        await createCategory({ data: value });
        form.reset();
        await queryClient.invalidateQueries({
          queryKey: ["admin", "categories"],
        });
        toast.success("Categoría creada");
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo crear la categoría"
          )
        );
      }
    },
    validators: { onSubmit: categorySchema },
  });
  return (
    <>
      <AdminPageHeader
        description="Agrupa el catálogo sin imponer una jerarquía."
        eyebrow="Catálogo"
        title="Categorías"
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              Categorías existentes
            </CardTitle>
            <CardDescription>
              Los productos conservan su categoría hasta que la cambies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.isPending && (
              <p className="text-muted-foreground text-sm">
                Cargando categorías…
              </p>
            )}
            {categories.isError && (
              <div className="flex flex-col items-start gap-3">
                <p className="text-destructive text-sm">
                  No se pudieron cargar las categorías.
                </p>
                <Button
                  onClick={async () => await categories.refetch()}
                  size="sm"
                  variant="outline"
                >
                  Reintentar
                </Button>
              </div>
            )}
            {categories.isSuccess && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.data.map((item) => (
                    <CategoryRow
                      item={item}
                      key={item.id}
                      queryClient={queryClient}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              Nueva categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
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
                        value={field.state.value}
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
                <Button type="submit">
                  <PlusIcon data-icon="inline-start" />
                  Crear categoría
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

interface CategoryRowProps {
  item: { id: string; name: string; slug: string };
  queryClient: ReturnType<typeof useQueryClient>;
}

function CategoryRow({ item, queryClient }: CategoryRowProps) {
  const form = useForm({
    defaultValues: { name: item.name, slug: item.slug },
    onSubmit: async ({ value }) => {
      try {
        await updateCategory({ data: { id: item.id, ...value } });
        await queryClient.invalidateQueries({
          queryKey: ["admin", "categories"],
        });
        toast.success("Categoría actualizada");
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo actualizar"
          )
        );
      }
    },
    validators: { onSubmit: categorySchema },
  });
  async function remove() {
    try {
      await deleteCategory({ data: { id: item.id } });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "categories"],
      });
      toast.success("Categoría eliminada");
    } catch (error) {
      toast.error(
        errorMessage(
          error instanceof Error ? error : null,
          "No se pudo eliminar"
        )
      );
    }
  }
  return (
    <TableRow>
      <TableCell>
        <form.Field name="name">
          {(field) => (
            <Input
              aria-label={`Nombre de ${item.name}`}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>
      </TableCell>
      <TableCell>
        <form.Field name="slug">
          {(field) => (
            <Input
              aria-label={`Slug de ${item.name}`}
              className="font-mono"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button
            aria-label={`Guardar ${item.name}`}
            onClick={() => form.handleSubmit()}
            size="icon-sm"
            variant="ghost"
          >
            <SaveIcon />
          </Button>
          <Button
            aria-label={`Eliminar ${item.name}`}
            onClick={remove}
            size="icon-sm"
            variant="destructive"
          >
            <Trash2Icon />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
