import { Button } from "@patche/ui/components/button";
import { Card, CardContent } from "@patche/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@patche/ui/components/empty";
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
import { ListTreeIcon, SaveIcon, TagsIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { NewCategoryDialog } from "@/components/admin/new-category-dialog";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/functions/categories";
import { errorMessage } from "@/lib/errors";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre"),
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
  return (
    <>
      <AdminPageHeader
        actions={<NewCategoryDialog />}
        icon={ListTreeIcon}
        title="Categorías"
      />
      <Card className="rounded-xl shadow-sm">
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
          {categories.isSuccess && categories.data.length > 0 && (
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
          {categories.isSuccess && categories.data.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia
                  className="bg-primary/10 text-primary"
                  variant="icon"
                >
                  <TagsIcon />
                </EmptyMedia>
                <EmptyTitle>Aún no hay categorías</EmptyTitle>
                <EmptyDescription>
                  Usa el botón de arriba para crear la primera.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </>
  );
}

interface CategoryRowProps {
  item: { id: string; name: string; slug: string };
  queryClient: ReturnType<typeof useQueryClient>;
}

function CategoryRow({ item, queryClient }: CategoryRowProps) {
  const form = useForm({
    defaultValues: { name: item.name },
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
        <span className="font-mono text-sm">/{item.slug}</span>
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
