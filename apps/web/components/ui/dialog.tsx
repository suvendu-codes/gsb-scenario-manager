"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-100 bg-ink/50" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-100 flex max-h-[calc(100vh-48px)] w-[calc(100%-48px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[20px] bg-panel shadow-[0_20px_60px_rgba(0,0,0,.25)]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute right-5 top-5 flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return <div className={cn("px-7 pr-14 pt-[26px]", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>): React.JSX.Element {
  return (
    <DialogPrimitive.Title
      className={cn("text-2xl font-bold tracking-tight text-ink", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>): React.JSX.Element {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1 text-sm leading-snug text-muted", className)}
      {...props}
    />
  );
}

export function DialogBody({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      className={cn("flex flex-col gap-5 overflow-y-auto px-7 pb-2.5 pt-[22px]", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 px-7 pb-[26px] pt-[18px]", className)}
      {...props}
    />
  );
}
