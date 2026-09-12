import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}

export function AdminPageHeader({
  actions,
  description,
  eyebrow,
  title,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-2">
        {eyebrow ? (
          <p className="text-muted-foreground font-mono text-[0.68rem] tracking-[0.24em] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-sans text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground max-w-xl text-sm leading-6">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}
