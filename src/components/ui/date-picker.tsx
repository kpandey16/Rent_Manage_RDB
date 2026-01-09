"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ date, onDateChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onDateChange(new Date(value));
    } else {
      onDateChange(undefined);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Input
          type="date"
          value={date ? format(date, "yyyy-MM-dd") : ""}
          onChange={handleChange}
          className="w-full"
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onRangeChange: (from: Date | undefined, to: Date | undefined) => void;
  className?: string;
}

export function DateRangePicker({ from, to, onRangeChange, className }: DateRangePickerProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
      <div className="flex-1">
        <label className="text-xs text-muted-foreground mb-1 block">From</label>
        <Input
          type="date"
          value={from ? format(from, "yyyy-MM-dd") : ""}
          onChange={(e) => {
            const value = e.target.value;
            onRangeChange(value ? new Date(value) : undefined, to);
          }}
          className="w-full"
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-muted-foreground mb-1 block">To</label>
        <Input
          type="date"
          value={to ? format(to, "yyyy-MM-dd") : ""}
          onChange={(e) => {
            const value = e.target.value;
            onRangeChange(from, value ? new Date(value) : undefined);
          }}
          className="w-full"
        />
      </div>
    </div>
  );
}
