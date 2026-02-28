"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { format, parse, subDays, subMonths, startOfMonth, startOfQuarter, startOfYear } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import * as React from "react"
import { type DateRange } from "react-day-picker"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-left font-normal text-xs",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {value ? format(selected!, "LLL dd, y") : placeholder}
          {value && (
            <X
              className="ml-auto h-3 w-3 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "")
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  from: string
  to: string
  onChangeFrom: (value: string) => void
  onChangeTo: (value: string) => void
  className?: string
  showPresets?: boolean
}

const PRESETS = [
  { label: "Last 24 hours", from: () => subDays(new Date(), 1), to: () => new Date() },
  { label: "Last 7 days", from: () => subDays(new Date(), 7), to: () => new Date() },
  { label: "Last 30 days", from: () => subDays(new Date(), 30), to: () => new Date() },
  { label: "Last 3 months", from: () => subMonths(new Date(), 3), to: () => new Date() },
  { label: "Last 12 months", from: () => subMonths(new Date(), 12), to: () => new Date() },
  { label: "Month to Date", from: () => startOfMonth(new Date()), to: () => new Date() },
  { label: "Quarter to Date", from: () => startOfQuarter(new Date()), to: () => new Date() },
  { label: "Year to Date", from: () => startOfYear(new Date()), to: () => new Date() },
] as const

export function DateRangePicker({
  from,
  to,
  onChangeFrom,
  onChangeTo,
  className,
  showPresets = true,
}: DateRangePickerProps) {
  const fromDate = from ? parse(from, "yyyy-MM-dd", new Date()) : undefined
  const toDate = to ? parse(to, "yyyy-MM-dd", new Date()) : undefined

  const date: DateRange | undefined =
    fromDate || toDate ? { from: fromDate, to: toDate } : undefined

  const hasValue = from || to

  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "h-9 justify-start text-left font-normal text-xs",
              hasValue && "rounded-r-none border-r-0",
              !hasValue && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} –{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>All time</span>
            )}
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-auto p-0 flex" align="end">
        <div className="flex">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={fromDate}
            selected={date}
            onSelect={(range) => {
              onChangeFrom(range?.from ? format(range.from, "yyyy-MM-dd") : "")
              onChangeTo(range?.to ? format(range.to, "yyyy-MM-dd") : "")
            }}
            numberOfMonths={2}
          />
          {showPresets && (
            <div className="border-l flex flex-col py-2 px-1 min-w-[150px]">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs h-8 font-normal"
                  onClick={() => {
                    onChangeFrom(format(preset.from(), "yyyy-MM-dd"))
                    onChangeTo(format(preset.to(), "yyyy-MM-dd"))
                  }}
                >
                  {preset.label}
                </Button>
              ))}
              <div className="border-t mt-1 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs h-8 font-normal w-full text-muted-foreground"
                  onClick={() => {
                    onChangeFrom("")
                    onChangeTo("")
                  }}
                >
                  All Time
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
      {hasValue && (
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-8 rounded-l-none border-l-0 shrink-0"
          onClick={() => {
            onChangeFrom("")
            onChangeTo("")
          }}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  )
}
