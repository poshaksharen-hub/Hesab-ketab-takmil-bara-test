'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type DateRange } from "@/hooks/use-financial-summary";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="بازه زمانی را انتخاب کنید" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="thisMonth">این ماه</SelectItem>
        <SelectItem value="lastMonth">ماه گذشته</SelectItem>
        <SelectItem value="thisWeek">این هفته</SelectItem>
        <SelectItem value="lastWeek">هفته گذشته</SelectItem>
        <SelectItem value="thisYear">امسال</SelectItem>
      </SelectContent>
    </Select>
  );
}
