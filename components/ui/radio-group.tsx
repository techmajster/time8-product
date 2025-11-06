"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"

import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  style?: "default" | "box"
}>({})

function RadioGroup({
  className,
  style = "default",
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root> & {
  style?: "default" | "box"
}) {
  return (
    <RadioGroupContext.Provider value={{ style }}>
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
    />
    </RadioGroupContext.Provider>
  )
}

function RadioGroupItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  const context = React.useContext(RadioGroupContext)
  const isBoxStyle = context?.style === "box"

  if (isBoxStyle) {
    return (
      <RadioGroupPrimitive.Item
        className={cn(
          "group relative flex w-full cursor-pointer rounded-lg border border p-3 text-left shadow-xs transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-muted",
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          <div className="aspect-square h-4 w-4 rounded-full border border text-foreground ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary">
            <RadioGroupPrimitive.Indicator className="flex items-center justify-center h-full w-full">
              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
            </RadioGroupPrimitive.Indicator>
          </div>
          <div className="flex-1">{children}</div>
        </div>
      </RadioGroupPrimitive.Item>
    )
  }

  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border text-foreground ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center h-full w-full">
        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

function RadioGroupItemLabel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-sm font-medium leading-none text-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function RadioGroupItemDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-sm leading-normal text-foreground mt-1.5 group-data-[state=checked]:text-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { RadioGroup, RadioGroupItem, RadioGroupItemLabel, RadioGroupItemDescription } 