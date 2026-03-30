import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type AppPageHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: ReactNode;
  stats?: ReactNode;
  utility?: ReactNode;
  className?: string;
};

type AppPageHeaderStatProps = {
  label: string;
  value: ReactNode;
  accentClassName?: string;
  valueClassName?: string;
};

export function AppPageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  meta,
  stats,
  utility,
  className,
}: AppPageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      {backHref ? (
        <Link
          to={backHref}
          className="ff-kicker inline-flex items-center text-[#7b8592] transition-colors hover:text-[#111318]"
        >
          ← {backLabel}
        </Link>
      ) : null}

      <div
        className={cn(
          "flex flex-col gap-4",
          stats ? "xl:flex-row xl:items-end xl:justify-between" : undefined,
        )}
      >
        <div className="space-y-3">
          <p className="ff-kicker">{eyebrow}</p>
          <h1 className="ff-display text-5xl text-[#111318] md:text-6xl">{title}</h1>
          {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
          {description ? (
            <p className="max-w-3xl text-base leading-7 text-[#66707d]">
              {description}
            </p>
          ) : null}
        </div>

        {stats ? <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[390px]">{stats}</div> : null}
      </div>

      {utility ? (
        <div className="flex flex-col gap-3 border border-[#d9dee5] bg-[#ffffff] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          {utility}
        </div>
      ) : null}
    </header>
  );
}

export function AppPageHeaderStat({
  label,
  value,
  accentClassName,
  valueClassName,
}: AppPageHeaderStatProps) {
  return (
    <div className="border border-[#d9dee5] bg-[#ffffff] px-4 py-3">
      <p className="ff-kicker">{label}</p>
      <p className={cn("mt-2 text-3xl font-black text-[#111318]", accentClassName, valueClassName)}>
        {value}
      </p>
    </div>
  );
}
