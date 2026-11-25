import { Input } from "@patche/ui/components/input";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import type { ComponentProps } from "react";

// Password field with a show/hide toggle; every other prop goes to the input.
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        className={`border-field h-11 rounded-xl bg-white pr-12 pl-3.5 ${className ?? ""}`}
        type={visible ? "text" : "password"}
      />
      <button
        aria-label="Mostrar contraseña"
        aria-pressed={visible}
        className="focus-visible:outline-brand absolute top-1/2 right-0.5 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? (
          <EyeOffIcon aria-hidden className="size-4" />
        ) : (
          <EyeIcon aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );
}
