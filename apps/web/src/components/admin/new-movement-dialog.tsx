import { Button } from "@patche/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@patche/ui/components/dialog";
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
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLineIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createStockMovement } from "@/functions/inventory";
import { errorMessage } from "@/lib/errors";
import { movementReasonLabels } from "@/lib/labels";

interface MovementValues {
  note: string;
  quantity: number;
  reason: "adjusted" | "received" | "returned";
  variantId: string;
}
const movementDefaults: MovementValues = {
  note: "",
  quantity: 1,
  reason: "received",
  variantId: "",
};

export function NewMovementDialog({
  variants,
}: {
  variants: { id: string; productName: string; variantName: string }[];
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm({
    defaultValues: movementDefaults,
    onSubmit: async ({ value }) => {
      try {
        await createStockMovement({ data: value });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
        ]);
        toast.success("Movimiento registrado");
        setOpen(false);
        form.reset();
      } catch (error) {
        toast.error(
          errorMessage(
            error instanceof Error ? error : null,
            "No se pudo registrar el movimiento"
          )
        );
      }
    },
  });
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button />}>
        <ArrowDownToLineIcon data-icon="inline-start" />
        Registrar movimiento
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="variantId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="movement-variant">Variante</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value ?? "")}
                  >
                    <SelectTrigger className="w-full" id="movement-variant">
                      <SelectValue placeholder="Selecciona">
                        {(value: string) => {
                          const variant = variants.find(
                            (item) => item.id === value
                          );
                          return variant
                            ? `${variant.productName} · ${variant.variantName}`
                            : "Selecciona";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {variants.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.productName} · {item.variantName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="reason">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="movement-reason">Motivo</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value === "adjusted" || value === "returned") {
                        field.handleChange(value);
                      } else {
                        field.handleChange("received");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full" id="movement-reason">
                      <SelectValue>
                        {(value: keyof typeof movementReasonLabels) =>
                          movementReasonLabels[value]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="received">Recepción</SelectItem>
                        <SelectItem value="adjusted">Ajuste</SelectItem>
                        <SelectItem value="returned">Devolución</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="quantity">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="movement-quantity">Cantidad</FieldLabel>
                  <Input
                    id="movement-quantity"
                    type="number"
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(event.target.valueAsNumber)
                    }
                  />
                  <FieldDescription>
                    Los ajustes pueden usar una cantidad negativa.
                  </FieldDescription>
                </Field>
              )}
            </form.Field>
            <form.Field name="note">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="movement-note">Nota</FieldLabel>
                  <Input
                    id="movement-note"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button disabled={isSubmitting} type="submit">
                  <ArrowDownToLineIcon data-icon="inline-start" />
                  {isSubmitting ? "Registrando…" : "Registrar"}
                </Button>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
