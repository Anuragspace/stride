import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, LayoutDashboard, Activity, Settings,
  ArrowRight, Hash, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvases } from '@/hooks/useCanvases';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section: string;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { canvases } = useCanvases();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    {
      id: 'home',
      label: 'Go to Home',
      icon: <LayoutDashboard className="w-[16px] h-[16px]" />,
      section: 'Navigation',
      action: () => { navigate('/'); onClose(); },
    },
    {
      id: 'activity',
      label: 'Go to Activity',
      icon: <Activity className="w-[16px] h-[16px]" />,
      section: 'Navigation',
      action: () => { navigate('/activity'); onClose(); },
    },
    {
      id: 'settings',
      label: 'Go to Settings',
      icon: <Settings className="w-[16px] h-[16px]" />,
      section: 'Navigation',
      action: () => { navigate('/settings'); onClose(); },
    },
    ...(canvases || []).map((canvas) => ({
      id: `canvas-${canvas.id}`,
      label: `${canvas.emoji || '📋'} ${canvas.name}`,
      icon: <FileText className="w-[16px] h-[16px]" />,
      section: 'Canvases',
      action: () => { navigate(`/canvas/${canvas.id}`); onClose(); },
    })),
  ];

  const filteredCommands = query
    ? commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const sections = Array.from(new Set(filteredCommands.map((c) => c.section)));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[activeIndex]) {
          filteredCommands[activeIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[560px] bg-surface-2 border border-hairline rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-[12px] px-[16px] py-[14px] border-b border-hairline">
              <Search className="w-[18px] h-[18px] text-ink-subtle flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search commands, canvases…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-subtle focus:outline-none"
              />
              <kbd className="text-[11px] text-ink-subtle bg-surface-3 px-[6px] py-[2px] rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto scrollbar-thin py-[4px]">
              {filteredCommands.length === 0 ? (
                <div className="px-[16px] py-[32px] text-center">
                  <p className="text-[13px] text-ink-subtle">No results found</p>
                </div>
              ) : (
                sections.map((section) => (
                  <div key={section}>
                    <div className="px-[16px] py-[6px]">
                      <span className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">
                        {section}
                      </span>
                    </div>
                    {filteredCommands
                      .filter((cmd) => cmd.section === section)
                      .map((cmd) => {
                        const globalIndex = filteredCommands.indexOf(cmd);
                        return (
                          <button
                            key={cmd.id}
                            onClick={cmd.action}
                            className={cn(
                              'w-full flex items-center gap-[12px] px-[16px] py-[10px] text-[13px] transition-colors duration-75',
                              globalIndex === activeIndex
                                ? 'bg-white/[0.06] text-ink'
                                : 'text-ink-muted hover:bg-white/[0.04] hover:text-ink'
                            )}
                          >
                            <span className="text-ink-subtle">{cmd.icon}</span>
                            <span className="flex-1 text-left">{cmd.label}</span>
                            {globalIndex === activeIndex && (
                              <ArrowRight className="w-[14px] h-[14px] text-ink-subtle" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-[16px] px-[16px] py-[10px] border-t border-hairline text-[11px] text-ink-subtle">
              <span className="flex items-center gap-[4px]">
                <kbd className="bg-surface-3 px-[4px] py-[1px] rounded text-[10px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-[4px]">
                <kbd className="bg-surface-3 px-[4px] py-[1px] rounded text-[10px]">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-[4px]">
                <kbd className="bg-surface-3 px-[4px] py-[1px] rounded text-[10px]">ESC</kbd>
                Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
