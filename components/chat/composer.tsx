// Faithful port of assistant-ui Elements "composer" (r.assistant-ui.com,
// MIT), retinted to this site's palette. The input is a textarea rather than
// their single-line input so long questions wrap, with the same Enter/IME
// semantics.
"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { paper, inkButton, iconSwap, iconSwapIn, iconSwapOut } from "./surfaces";
import { ArrowUpIcon, SquareIcon } from "./icons";

export function Composer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="composer"
      className={cn("relative w-full", className)}
      {...props}
    />
  );
}

export function ComposerBar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-bar"
      className={cn(
        paper,
        "flex w-full flex-col gap-2 rounded-[24px] p-2.5 transition-colors focus-within:border-line-strong",
        className,
      )}
      {...props}
    />
  );
}

export function ComposerInput({
  onSubmit,
  onKeyDown,
  className,
  ...props
}: Omit<ComponentProps<"textarea">, "onSubmit"> & { onSubmit?: () => void }) {
  return (
    <textarea
      data-slot="composer-input"
      rows={1}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (
          event.key !== "Enter" ||
          event.shiftKey ||
          event.nativeEvent.isComposing
        )
          return;
        event.preventDefault();
        onSubmit?.();
      }}
      className={cn(
        "min-h-11 w-full resize-none overflow-y-hidden bg-transparent px-3 pt-2 text-[15px] leading-relaxed text-ink caret-accent outline-none placeholder:text-ink-faint",
        className,
      )}
      {...props}
    />
  );
}

export function ComposerToolbar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-toolbar"
      className={cn("flex items-center justify-between", className)}
      {...props}
    />
  );
}

export function ComposerActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-actions"
      className={cn("flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

export function ComposerSend({
  streaming,
  idle,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  streaming: boolean;
  idle: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={streaming ? "Stop generating" : "Send message"}
      data-slot="composer-send"
      className={cn(
        "grid size-8 place-items-center rounded-full",
        streaming || idle
          ? inkButton
          : "cursor-default bg-ink/[0.06] text-ink-faint/60 transition-colors",
        className,
      )}
      {...props}
    >
      <ArrowUpIcon
        className={cn(iconSwap, "size-4", streaming ? iconSwapOut : iconSwapIn)}
      />
      <SquareIcon
        className={cn(iconSwap, "size-4", streaming ? iconSwapIn : iconSwapOut)}
      />
    </button>
  );
}
