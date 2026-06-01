import React from 'react';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn, isOverdue } from '@/lib/utils';

interface DueDatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

export function DueDatePicker({ value, onChange }: DueDatePickerProps) {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    if (dateVal) {
      onChange(new Date(dateVal).toISOString());
    } else {
      onChange(null);
    }
  };

  const overdue = isOverdue(value);
  const formattedDate = value ? format(new Date(value), 'yyyy-MM-dd') : '';

  return (
    <div className="flex items-center gap-[8px] -ml-[4px]">
      <div className={cn(
        "relative flex items-center bg-white/[0.02] hover:bg-white/[0.05] border border-hairline/60 hover:border-white/[0.12] rounded-lg px-[8px] py-[4px] cursor-pointer transition-all duration-150 group h-[28px]",
        overdue && "bg-danger/5 border-danger/25 text-danger"
      )}>
        <Calendar className={cn("w-[13px] h-[13px] text-ink-subtle mr-[6px] pointer-events-none group-hover:text-ink transition-colors", overdue && "text-danger")} />
        <input
          type="date"
          value={formattedDate}
          onChange={handleDateChange}
          className="bg-transparent border-none text-[12px] text-ink focus:outline-none cursor-pointer w-[124px] select-none text-left [color-scheme:dark] font-medium"
        />
      </div>
      {value && (
        <button
          onClick={() => onChange(null)}
          className="p-[4px] rounded hover:bg-white/[0.05] text-ink-subtle hover:text-ink transition-colors"
          title="Clear due date"
        >
          <X className="w-[12px] h-[12px]" />
        </button>
      )}
    </div>
  );
}
