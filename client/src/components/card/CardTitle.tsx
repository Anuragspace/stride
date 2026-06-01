import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CardTitleProps {
  title: string;
  onSave: (title: string) => void;
  onChange?: (title: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CardTitle({ title, onSave, onChange, placeholder = 'Untitled Card', autoFocus = false }: CardTitleProps) {
  const [isEditing, setIsEditing] = useState(autoFocus);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      // Auto-resize
      inputRef.current.style.height = 'auto';
      const sh = inputRef.current.scrollHeight;
      inputRef.current.style.height = sh > 0 ? `${sh}px` : '32px';
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) {
      onSave(trimmed);
    } else {
      setValue(title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setValue(title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className={cn(
        "w-full rounded-lg transition-all duration-150",
        !title && "border border-white/[0.06] bg-white/[0.01] px-[12px] py-[8px] focus-within:border-white/[0.12] focus-within:bg-white/[0.02]"
      )}>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            setValue(val);
            if (onChange) onChange(val);
            e.target.style.height = 'auto';
            const sh = e.target.scrollHeight;
            e.target.style.height = sh > 0 ? `${sh}px` : '32px';
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full text-[20px] font-semibold text-ink tracking-display bg-transparent border-none outline-none resize-none leading-tight placeholder:text-ink-muted/40 placeholder:italic"
          rows={1}
        />
      </div>
    );
  }

  return (
    <h2
      onClick={() => setIsEditing(true)}
      className={cn(
        "text-[20px] font-semibold tracking-display cursor-text hover:bg-white/[0.03] rounded-md px-[4px] -mx-[4px] py-[2px] transition-colors duration-150 leading-tight",
        title ? "text-ink" : "text-ink-muted/50 italic border border-dashed border-hairline bg-white/[0.01] px-[12px] py-[8px]"
      )}
      role="button"
      tabIndex={0}
    >
      {title || placeholder}
    </h2>
  );
}
