"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c10] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-5 w-9" : "h-6 w-11",
        "data-[state=checked]:bg-white data-[state=unchecked]:bg-white/20",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full shadow-md ring-0 transition-transform",
          size === "sm"
            ? "size-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
            : "size-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
          "data-[state=checked]:bg-[#0b0c10] data-[state=unchecked]:bg-white/80"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }

