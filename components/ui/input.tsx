import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border border-input-border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-background shadow-sm hover:bg-accent/5",
        ghost: "border-transparent bg-transparent hover:bg-accent",
        filled: "border-transparent bg-muted hover:bg-muted/80",
      },
      borderStyle: {
        default: "border-input-border",
        border: "border-border", 
        accent: "border-accent",
        muted: "border-muted",
        primary: "border-primary",
        secondary: "border-secondary",
      },
      size: {
        sm: "h-8 px-2 py-1 text-xs",
        default: "h-9 px-3 py-1 text-sm md:text-sm",
        lg: "h-11 px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      borderStyle: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  icon?: React.ComponentType<{ className?: string }>
  iconPosition?: "left" | "right"
  showPasswordToggle?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    variant, 
    borderStyle,
    size, 
    icon: Icon, 
    iconPosition = "left", 
    showPasswordToggle,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    
    // Determine if this is a password input that should show toggle
    const isPasswordInput = type === "password"
    const shouldShowToggle = isPasswordInput && (showPasswordToggle ?? true)
    const displayType = isPasswordInput && showPassword ? "text" : type

    // Calculate padding based on icons
    const hasLeftIcon = Icon && iconPosition === "left"
    const hasRightIcon = (Icon && iconPosition === "right") || shouldShowToggle
    
    const paddingClasses = cn(
      hasLeftIcon && {
        "pl-9": size === "default",
        "pl-8": size === "sm", 
        "pl-10": size === "lg"
      },
      hasRightIcon && {
        "pr-9": size === "default",
        "pr-8": size === "sm",
        "pr-10": size === "lg"
      }
    )

    return (
      <div className="relative">
        {/* Left Icon */}
        {hasLeftIcon && (
          <Icon className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
            {
              "left-2 h-3 w-3": size === "sm",
              "left-3 h-4 w-4": size === "default", 
              "left-3 h-5 w-5": size === "lg"
            }
          )} />
        )}
        
        <input
          type={displayType}
          className={cn(
            inputVariants({ variant, borderStyle, size }),
            paddingClasses,
            className
          )}
          ref={ref}
          {...props}
        />
        
        {/* Right Icon */}
        {Icon && iconPosition === "right" && !shouldShowToggle && (
          <Icon className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
            {
              "right-2 h-3 w-3": size === "sm",
              "right-3 h-4 w-4": size === "default",
              "right-3 h-5 w-5": size === "lg"
            }
          )} />
        )}
        
        {/* Password Toggle */}
        {shouldShowToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
              {
                "right-2 h-3 w-3": size === "sm",
                "right-3 h-4 w-4": size === "default", 
                "right-3 h-5 w-5": size === "lg"
              }
            )}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-full w-full" />
            ) : (
              <Eye className="h-full w-full" />
            )}
          </button>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
