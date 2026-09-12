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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@patche/ui/components/field";
import { Input } from "@patche/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SaveIcon, TruckIcon } from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/page-header";
import {
  getStoreSettings,
  updateShippingRate,
} from "@/functions/store-settings";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useQuery({
    queryFn: () => getStoreSettings(),
    queryKey: ["admin", "settings"],
  });
  return (
    <>
      <AdminPageHeader
        description="Valores globales que se aplican al checkout."
        eyebrow="Tienda"
        title="Ajustes"
      />
      {settings.isPending && (
        <p className="text-muted-foreground text-sm">Cargando ajustes…</p>
      )}
      {settings.isError && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-destructive text-sm">
            No se pudieron cargar los ajustes.
          </p>
          <Button
            onClick={async () => await settings.refetch()}
            size="sm"
            variant="outline"
          >
            Reintentar
          </Button>
        </div>
      )}
      {settings.isSuccess && settings.data && (
        <ShippingForm shippingRateAmount={settings.data.shippingRateAmount} />
      )}
      {settings.isSuccess && !settings.data && (
        <p className="text-destructive text-sm">
          No se encontraron los ajustes.
        </p>
      )}
    </>
  );
}

function ShippingForm({ shippingRateAmount }: { shippingRateAmount: number }) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: { pesos: shippingRateAmount / 100 },
    onSubmit: async ({ value }) => {
      try {
        await updateShippingRate({
          data: { shippingRateAmount: Math.round(value.pesos * 100) },
        });
        await queryClient.invalidateQueries({
          queryKey: ["admin", "settings"],
        });
        toast.success("Tarifa guardada");
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo guardar la tarifa"
          )
        );
      }
    },
  });
  return (
    <Card className="max-w-xl rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <TruckIcon aria-hidden="true" className="text-primary size-4" />
          Tarifa de envío
        </CardTitle>
        <CardDescription>
          Se cobra una vez cuando el checkout contiene al menos un producto
          físico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="pesos">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="shipping-rate">Monto en MXN</FieldLabel>
                  <Input
                    id="shipping-rate"
                    min="0"
                    step="0.01"
                    type="number"
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(event.target.valueAsNumber)
                    }
                  />
                  <FieldDescription>
                    Los productos exclusivamente digitales no pagan envío.
                  </FieldDescription>
                </Field>
              )}
            </form.Field>
            <Button type="submit">
              <SaveIcon data-icon="inline-start" />
              Guardar tarifa
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
