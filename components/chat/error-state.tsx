// Ported from assistant-ui Elements "error-state" (r.assistant-ui.com, MIT),
// retinted to this site's palette.
"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { ShimmerLabel } from "./surfaces";
import { AlertIcon, RefreshIcon } from "./icons";

export interface ErrorStateProps
  extends Omit<ComponentProps<"div">, "children" | "role"> {
  title: string;
  detail: string;
  retrying: boolean;
  onRetry: () => void;
}

export function ErrorState({
  title,
  detail,
  retrying,
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  if (retrying) {
    return (
      <div
        data-slot="error-state"
        key="retrying"
        role="status"
        className={cn(
          "anim-fade-in flex w-full items-center gap-2.5 text-sm",
          className,
        )}
        {...props}
      >
        <RefreshIcon className="size-3.5 shrink-0 animate-spin text-ink-faint motion-reduce:animate-none" />
        <ShimmerLabel className="relative inline-block">Retrying</ShimmerLabel>
      </div>
    );
  }

  return (
    <div
      data-slot="error-state"
      key="error"
      role="alert"
      className={cn(
        "anim-fade-in flex w-full items-start gap-2.5 rounded-2xl bg-red-700/[0.06] px-4 py-3 text-sm",
        className,
      )}
      {...props}
    >
      <AlertIcon className="mt-0.5 size-4 shrink-0 text-red-800/70" />
      <div>
        <p className="font-medium text-red-900">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-red-900/60">
          {detail}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="pressable ms-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-red-900 transition-colors hover:bg-red-700/10"
      >
        <RefreshIcon className="size-3" />
        Retry
      </button>
    </div>
  );
}
