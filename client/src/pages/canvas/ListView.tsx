import React from 'react';
import { List } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function ListView() {
  return (
    <EmptyState
      icon={<List className="w-[48px] h-[48px]" />}
      title="List View"
      description="Compact list view coming in Phase 4. Switch to Board view for now."
    />
  );
}
