"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

import { dialogStyles } from "./dialog.styles";

/**
 * Modal root. Control it with `open` and `onOpenChange`.
 * Radix handles focus trapping, Esc to close, scroll lock and ARIA.
 */
export const Dialog = DialogPrimitive.Root;

/**
 * Modal panel with a dimmed overlay and a close button.
 * Render a DialogTitle inside it so the dialog has an accessible name.
 *
 * @param className - Extra classes, merged over the panel styles.
 */
export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={dialogStyles.overlay} />
      <DialogPrimitive.Content className={cn(dialogStyles.content, className)} {...props}>
        {children}
        <DialogPrimitive.Close aria-label="Close" className={dialogStyles.close}>
          <X className={dialogStyles.closeIcon} aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/**
 * Top section of a dialog, holding the title and description.
 *
 * @param className - Extra classes, merged over the default styles.
 */
export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return <div className={cn(dialogStyles.header, className)} {...props} />;
}

/**
 * Dialog heading. Used as the dialog's accessible name.
 *
 * @param className - Extra classes, merged over the default styles.
 */
export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>): React.JSX.Element {
  return <DialogPrimitive.Title className={cn(dialogStyles.title, className)} {...props} />;
}

/**
 * Short supporting text under the title, announced by screen readers.
 *
 * @param className - Extra classes, merged over the default styles.
 */
export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>): React.JSX.Element {
  return (
    <DialogPrimitive.Description className={cn(dialogStyles.description, className)} {...props} />
  );
}

/**
 * Scrollable middle section of a dialog, usually the form fields.
 *
 * @param className - Extra classes, merged over the default styles.
 */
export function DialogBody({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return <div className={cn(dialogStyles.body, className)} {...props} />;
}

/**
 * Bottom section of a dialog, usually a status note and the action buttons.
 *
 * @param className - Extra classes, merged over the default styles.
 */
export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return <div className={cn(dialogStyles.footer, className)} {...props} />;
}
