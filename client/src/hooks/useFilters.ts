import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterState, SortState, CardStatus, CardPriority, CardType, Card } from '@/types';

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const parseFilters = (): FilterState => {
    const status = searchParams.get('status')?.split(',') as CardStatus[] | undefined;
    const priority = searchParams.get('priority')?.split(',').map(Number) as CardPriority[] | undefined;
    const type = searchParams.get('type')?.split(',') as CardType[] | undefined;
    return {
      status: status?.length ? status : undefined,
      priority: priority?.length ? priority : undefined,
      type: type?.length ? type : undefined,
    };
  };

  const parseSort = (): SortState => {
    const sortField = searchParams.get('sortBy') || 'created_at';
    const sortDir = searchParams.get('sortDir') || 'desc';
    return {
      field: sortField as SortState['field'],
      direction: sortDir as SortState['direction'],
    };
  };

  const [filters, setFiltersState] = useState<FilterState>(parseFilters);
  const [sort, setSortState] = useState<SortState>(parseSort);

  const setFilters = useCallback((newFilters: FilterState) => {
    setFiltersState(newFilters);
    const params = new URLSearchParams(searchParams);
    // Clear existing filter params
    params.delete('status');
    params.delete('priority');
    params.delete('type');
    // Set new params
    if (newFilters.status?.length) params.set('status', newFilters.status.join(','));
    if (newFilters.priority?.length) params.set('priority', newFilters.priority.join(','));
    if (newFilters.type?.length) params.set('type', newFilters.type.join(','));
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const setSort = useCallback((newSort: SortState) => {
    setSortState(newSort);
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', newSort.field);
    params.set('sortDir', newSort.direction);
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const filterCards = useCallback(
    (cards: Card[]): Card[] => {
      return cards.filter((card) => {
        if (filters.status?.length && !filters.status.includes(card.status as CardStatus)) return false;
        if (filters.priority?.length && !filters.priority.includes(card.priority as CardPriority)) return false;
        if (filters.type?.length && !filters.type.includes(card.type as CardType)) return false;
        return true;
      });
    },
    [filters]
  );

  return {
    filters,
    setFilters,
    sort,
    setSort,
    filterCards,
  };
}
