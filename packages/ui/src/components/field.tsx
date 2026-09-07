import type { ComponentProps } from "react";

import { Label } from "@patche/ui/components/label";
import { cn } from "@patche/ui/lib/utils";

function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex w-full flex-col gap-5", className)} data-slot="field-group" {...props} />;
}

function Field({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("group/field flex w-full flex-col gap-2 data-[invalid=true]:text-destructive", className)} data-slot="field" role="group" {...props} />;
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return <Label className={cn("flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50", className)} data-slot="field-label" {...props} />;
}

function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-muted-foreground text-xs leading-normal", className)} data-slot="field-description" {...props} />;
}

function FieldError({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-destructive text-xs", className)} data-slot="field-error" role="alert" {...props} />;
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel };
