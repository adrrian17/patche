import { Button } from "@patche/ui/components/button";
import { useEffect, useState } from "react";

const RESEND_COOLDOWN_SECONDS = 60;

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return email;
  }

  const visibleCharacters = Math.min(2, localPart.length);
  return `${localPart.slice(0, visibleCharacters)}${"•".repeat(
    Math.max(1, localPart.length - visibleCharacters)
  )}@${domain}`;
}

function getResendLabel(isResending: boolean, cooldown: number): string {
  if (isResending) {
    return "Enviando...";
  }
  if (cooldown > 0) {
    return `Reenviar en ${cooldown}s`;
  }
  return "Reenviar enlace";
}

interface MagicLinkConfirmationProps {
  email: string;
  onBack: () => void;
  onResend: () => Promise<boolean>;
}

export function MagicLinkConfirmation({
  email,
  onBack,
  onResend,
}: MagicLinkConfirmationProps) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  async function handleResend() {
    if (cooldown > 0 || isResending) {
      return;
    }

    setIsResending(true);
    try {
      if (await onResend()) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch {
      // The parent owns the error message; keep the confirmation state intact.
    }
    setIsResending(false);
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md space-y-6 p-6 text-center">
      <div className="space-y-2">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
          Revisa tu correo
        </p>
        <h1 className="text-3xl font-bold">Tu enlace está en camino</h1>
        <p className="text-muted-foreground text-sm leading-6">
          Enviamos un enlace a <strong>{maskEmail(email)}</strong>. Ábrelo para
          entrar a Patche. También revisa la carpeta de spam.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full"
          disabled={isResending || cooldown > 0}
          onClick={handleResend}
          type="button"
          variant="outline"
        >
          {getResendLabel(isResending, cooldown)}
        </Button>
        <Button
          className="w-full"
          onClick={onBack}
          type="button"
          variant="link"
        >
          Usar otro correo
        </Button>
      </div>

      <p aria-live="polite" className="text-muted-foreground text-xs">
        El enlace caduca en 10 minutos y solo funciona una vez.
      </p>
    </div>
  );
}
