"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Match react-day-picker's expected interface
interface DropdownOption {
  value: number
  label: string
  disabled: boolean
}

interface DatePickerDropdownProps {
  components?: any
  classNames?: any
  options?: DropdownOption[]
  value?: string | number | readonly string[]
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void
  [key: string]: any // Allow additional props
}

export function DatePickerDropdown({ options, value, onChange, ...props }: DatePickerDropdownProps) {
  const handleValueChange = (newValue: string) => {
    if (onChange) {
      const syntheticEvent = {
        target: {
          value: newValue
        }
      } as React.ChangeEvent<HTMLSelectElement>

      onChange(syntheticEvent)
    }
  }

  // Filter out any disabled props that might be passed to the Select
  const { disabled, ...selectProps } = props

  return (
    <Select value={value?.toString()} onValueChange={handleValueChange} {...selectProps}>
      <SelectTrigger className="h-8 w-fit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[99999]">
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value.toString()}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 