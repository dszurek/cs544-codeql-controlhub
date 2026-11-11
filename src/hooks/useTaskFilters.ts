'use client';

import { useState } from 'react';

export type SortField = 'dueDate' | 'priority' | 'createdAt' | 'title';
export type SortOrder = 'asc' | 'desc';
export type GroupBy = 'none' | 'project' | 'priority' | 'dueDate';

export interface FilterState {
  sort: SortField;
  order: SortOrder;
  filterType: string;
  filterPriority: number | null;
  filterStatus: string;
  overdueOnly: boolean;
  groupBy: GroupBy;
}

export interface UseTaskFiltersReturn {
  filters: FilterState;
  setSort: (field: SortField) => void;
  setSortAndOrder: (field: SortField, order: SortOrder) => void;
  setFilterType: (type: string) => void;
  setFilterPriority: (priority: number | null) => void;
  setFilterStatus: (status: string) => void;
  setOverdueOnly: (v: boolean) => void;
  setGroupBy: (g: GroupBy) => void;
  reset: () => void;
  toQueryParams: () => Record<string, string>;
}

export const defaults: FilterState = {
  sort: 'createdAt',
  order: 'asc',
  filterType: '',
  filterPriority: null,
  filterStatus: '',
  overdueOnly: false,
  groupBy: 'none',
};

export function useTaskFilters(): UseTaskFiltersReturn {
  const [filters, setFilters] = useState<FilterState>(defaults);

  function setSort(field: SortField) {
    setFilters((prev) => {
      if (prev.sort === field) {
        return { ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' };
      }
      return { ...prev, sort: field, order: 'asc' };
    });
  }

  function setSortAndOrder(field: SortField, order: SortOrder) {
    setFilters((prev) => ({ ...prev, sort: field, order }));
  }

  function setFilterType(type: string) {
    setFilters((prev) => ({ ...prev, filterType: type }));
  }

  function setFilterPriority(priority: number | null) {
    setFilters((prev) => ({ ...prev, filterPriority: priority }));
  }

  function setFilterStatus(status: string) {
    setFilters((prev) => ({ ...prev, filterStatus: status }));
  }

  function setOverdueOnly(v: boolean) {
    setFilters((prev) => ({ ...prev, overdueOnly: v }));
  }

  function setGroupBy(g: GroupBy) {
    setFilters((prev) => ({ ...prev, groupBy: g }));
  }

  function reset() {
    setFilters(defaults);
  }

  function toQueryParams(): Record<string, string> {
    const params: Record<string, string> = {};

    if (filters.sort !== defaults.sort) {
      params.sort = filters.sort;
    }
    if (filters.order !== defaults.order) {
      params.order = filters.order;
    }
    if (filters.filterType !== defaults.filterType) {
      params.type = filters.filterType;
    }
    if (filters.filterPriority !== null) {
      params.priority = String(filters.filterPriority);
    }
    if (filters.filterStatus !== defaults.filterStatus) {
      params.status = filters.filterStatus;
    }
    if (filters.overdueOnly !== defaults.overdueOnly) {
      params.overdueOnly = String(filters.overdueOnly);
    }
    // groupBy is UI-only, not included

    return params;
  }

  return {
    filters,
    setSort,
    setSortAndOrder,
    setFilterType,
    setFilterPriority,
    setFilterStatus,
    setOverdueOnly,
    setGroupBy,
    reset,
    toQueryParams,
  };
}
