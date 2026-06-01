import React from 'react';
import { Table2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function TableView() {
  return (
    <EmptyState
      icon={<Table2 className="w-[48px] h-[48px]" />}
      title="Table View"
      description="Spreadsheet-style view coming in Phase 4. Switch to Board view for now."
    />
  );
}
