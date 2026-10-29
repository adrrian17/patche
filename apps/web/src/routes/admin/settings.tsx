import type { HomeImageSlot } from "@patche/storage";
import { Button } from "@patche/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@patche/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@patche/ui/components/field";
import { Input } from "@patche/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon, SaveIcon, Settings2Icon, TruckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/page-header";
import { getHomeImages } from "@/functions/home-images";
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
      <AdminPageHeader icon={Settings2Icon} title="Ajustes" />
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
        <div className="flex flex-col gap-6">
          <ShippingForm shippingRateAmount={settings.data.shippingRateAmount} />
          <HomeImagesCard />
        </div>
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

const homeImageFields: { label: string; slot: HomeImageSlot }[] = [
  { label: "Imagen principal", slot: "hero" },
  { label: "Washi tapes", slot: "washi" },
  { label: "Escritura fina", slot: "pens" },
];
const homeImagesQueryKey = ["admin", "home-images"];

async function uploadHomeImage(slot: HomeImageSlot, file: File) {
  const body = new FormData();
  body.set("slot", slot);
  body.set("file", file);
  try {
    const response = await fetch("/api/admin/home-images", {
      body,
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return true;
  } catch (error) {
    toast.error(
      errorMessage(
        error instanceof Error ? error : null,
        "No se pudo subir la imagen"
      )
    );
    return false;
  }
}

function HomeImagesCard() {
  const homeImages = useQuery({
    queryFn: () => getHomeImages(),
    queryKey: homeImagesQueryKey,
  });
  return (
    <section aria-labelledby="home-images-title">
      <Card className="max-w-xl rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2 text-base font-semibold"
            id="home-images-title"
          >
            <ImageIcon aria-hidden="true" className="text-primary size-4" />
            Imágenes de inicio
          </CardTitle>
          <CardDescription>
            Se muestran en la página de inicio de la tienda. Al subir una imagen
            se reemplaza la anterior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {homeImages.isError && (
            <p className="text-destructive text-sm">
              No se pudieron cargar las imágenes.
            </p>
          )}
          {homeImages.isSuccess && (
            <FieldGroup>
              {homeImageFields.map(({ label, slot }) => (
                <HomeImageField
                  key={slot}
                  label={label}
                  slot={slot}
                  url={homeImages.data[slot]}
                />
              ))}
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function HomeImageField({
  label,
  slot,
  url,
}: {
  label: string;
  slot: HomeImageSlot;
  url: string | null;
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const inputId = `home-image-${slot}`;

  async function upload(file: File) {
    setUploading(true);
    const saved = await uploadHomeImage(slot, file);
    setUploading(false);
    if (saved) {
      await queryClient.invalidateQueries({ queryKey: homeImagesQueryKey });
      toast.success("Imagen guardada");
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="flex items-center gap-4">
        {url ? (
          <img
            alt=""
            className="size-16 shrink-0 rounded-lg border object-cover"
            src={url}
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center rounded-lg border text-xs">
            Vacía
          </div>
        )}
        <Input
          accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
          disabled={uploading}
          id={inputId}
          type="file"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              await upload(file);
            }
          }}
        />
      </div>
    </Field>
  );
}
