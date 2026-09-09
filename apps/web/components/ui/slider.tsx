"use client"

import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  accentColor?: string;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  accentColor = "var(--st-amber, #d9a441)",
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/20 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          style={{ backgroundColor: accentColor }}
          className="absolute h-full select-none data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          style={{
            backgroundColor: accentColor,
            borderColor: "#ffffff",
          }}
          className="relative block size-3.5 shrink-0 rounded-full border-2 border-white cursor-pointer transition-transform select-none after:absolute after:-inset-2 focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 shadow-xs hover:scale-110"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
