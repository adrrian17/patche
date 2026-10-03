import type { FormEvent } from "react";
import { toast } from "sonner";

// ponytail: no newsletter backend yet; wire this to a list provider when one is chosen.
export function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  event.currentTarget.reset();
  toast.info("Muy pronto podrás suscribirte a nuestro boletín.");
}
