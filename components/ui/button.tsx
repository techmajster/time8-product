import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-primary/90 hover:before:absolute hover:before:inset-0 hover:before:bg-white/10 hover:before:rounded-lg hover:before:pointer-events-none relative overflow-hidden",
        primary:
          "bg-primary text-primary-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-primary/90 hover:before:absolute hover:before:inset-0 hover:before:bg-white/10 hover:before:rounded-lg hover:before:pointer-events-none relative overflow-hidden",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-secondary/80 hover:before:absolute hover:before:inset-0 hover:before:bg-white/20 hover:before:rounded-lg hover:before:pointer-events-none relative overflow-hidden",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-destructive/90 focus-visible:ring-destructive",
        success:
          "bg-success text-success-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-success/90 focus-visible:ring-success",
        warning:
          "bg-warning text-warning-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-warning/90 focus-visible:ring-warning",
        info:
          "bg-info text-info-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-info/90 focus-visible:ring-info",
        outline:
          "border border-input bg-background text-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring",
        ghost: 
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: 
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 py-2 text-xs",
        lg: "h-10 px-8 py-2",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // When asChild is true, we can only have one child element
    // So we combine loading spinner and children into a single fragment when needed
    const content = loading && !asChild ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {children}
      </>
    ) : (
      children
    )
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
