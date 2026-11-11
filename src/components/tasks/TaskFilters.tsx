'use client';

import { defaults, type FilterState, type SortField, type SortOrder, type GroupBy } from '@/hooks/useTaskFilters';

interface TaskFiltersProps {
  filters: FilterState;
  onSetSortAndOrder: (field: SortField, order: SortOrder) => void;
  onSetFilterType: (type: string) => void;
  onSetFilterPriority: (priority: number | null) => void;
  onSetFilterStatus: (status: string) => void;
  onSetOverdueOnly: (v: boolean) => void;
  onSetGroupBy: (g: GroupBy) => void;
  onReset: () => void;
}

function isNonDefault(filters: FilterState): boolean {
  return (
    filters.sort !== defaults.sort ||
    filters.order !== defaults.order ||
    filters.filterType !== defaults.filterType ||
    filters.filterPriority !== defaults.filterPriority ||
    filters.filterStatus !== defaults.filterStatus ||
    filters.overdueOnly !== defaults.overdueOnly ||
    filters.groupBy !== defaults.groupBy
  );
}


const controlStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '4px 6px',
  background: 'var(--dark)',
  border: '1px solid rgba(216, 204, 192,0.2)',
  color: 'var(--beige-light)',
  borderRadius: '4px',
  cursor: 'pointer',
};

export function TaskFilters({
  filters,
  onSetSortAndOrder,
  onSetFilterType,
  onSetFilterPriority,
  onSetFilterStatus,
  onSetOverdueOnly,
  onSetGroupBy,
  onReset,
}: TaskFiltersProps) {
  const showReset = isNonDefault(filters);

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const [field, order] = val.split('_') as [SortField, SortOrder];
    onSetSortAndOrder(field, order);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center',
        fontSize: '0.75rem',
        padding: '0.5rem 0',
      }}
    >
      {/* Sort */}
      <select
        aria-label="Sort"
        value={filters.sort + '_' + filters.order}
        onChange={handleSortChange}
        style={controlStyle}
      >
        <option value="createdAt_asc">Created (oldest)</option>
        <option value="createdAt_desc">Created (newest)</option>
        <option value="dueDate_asc">Due date</option>
        <option value="priority_asc">Priority</option>
        <option value="title_asc">Title A-Z</option>
        <option value="title_desc">Title Z-A</option>
      </select>

      {/* Type filter */}
      <select
        aria-label="Filter by type"
        value={filters.filterType}
        onChange={(e) => onSetFilterType(e.target.value)}
        style={controlStyle}
      >
        <option value="">All types</option>
        <option value="assignment">Assignment</option>
        <option value="meeting">Meeting</option>
        <option value="shopping">Shopping</option>
        <option value="general">General</option>
      </select>

      {/* Priority filter */}
      <select
        aria-label="Filter by priority"
        value={filters.filterPriority ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          onSetFilterPriority(val === '' ? null : Number(val));
        }}
        style={controlStyle}
      >
        <option value="">All priorities</option>
        <option value="1">P1 Urgent</option>
        <option value="2">P2 High</option>
        <option value="3">P3 Medium</option>
        <option value="4">P4 Low</option>
      </select>

      {/* Status filter */}
      <select
        aria-label="Filter by status"
        value={filters.filterStatus}
        onChange={(e) => onSetFilterStatus(e.target.value)}
        style={controlStyle}
      >
        <option value="">All</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
      </select>

      {/* Overdue only */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.75rem',
          color: 'var(--beige-light)',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={filters.overdueOnly}
          onChange={(e) => onSetOverdueOnly(e.target.checked)}
        />
        Overdue only
      </label>

      {/* Group by */}
      <select
        aria-label="Group by"
        value={filters.groupBy}
        onChange={(e) => onSetGroupBy(e.target.value as GroupBy)}
        style={controlStyle}
      >
        <option value="none">No grouping</option>
        <option value="project">By project</option>
        <option value="priority">By priority</option>
        <option value="dueDate">By due date</option>
      </select>

      {/* Reset */}
      {showReset && (
        <button
          onClick={onReset}
          style={{
            ...controlStyle,
            color: 'var(--leather-light)',
            borderColor: 'rgba(199, 154, 107,0.4)',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
