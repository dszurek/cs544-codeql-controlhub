import { renderHook, act } from '@testing-library/react';
import { useTaskFilters } from '@/hooks/useTaskFilters';

describe('useTaskFilters', () => {
  it('initial state matches defaults', () => {
    const { result } = renderHook(() => useTaskFilters());
    expect(result.current.filters).toEqual({
      sort: 'createdAt',
      order: 'asc',
      filterType: '',
      filterPriority: null,
      filterStatus: '',
      overdueOnly: false,
      groupBy: 'none',
    });
  });

  it('setSort changes sort field and resets order to asc', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => {
      result.current.setSort('priority');
    });
    expect(result.current.filters.sort).toBe('priority');
    expect(result.current.filters.order).toBe('asc');
  });

  it('setSort same field toggles order from asc to desc', () => {
    const { result } = renderHook(() => useTaskFilters());
    // default sort is 'createdAt', order is 'asc'
    act(() => {
      result.current.setSort('createdAt');
    });
    expect(result.current.filters.sort).toBe('createdAt');
    expect(result.current.filters.order).toBe('desc');
  });

  it('setSort same field when desc toggles back to asc', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => {
      result.current.setSort('createdAt'); // asc -> desc
    });
    act(() => {
      result.current.setSort('createdAt'); // desc -> asc
    });
    expect(result.current.filters.order).toBe('asc');
  });

  it('setFilterType updates filterType', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => {
      result.current.setFilterType('assignment');
    });
    expect(result.current.filters.filterType).toBe('assignment');
  });

  it('setFilterPriority updates filterPriority', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => {
      result.current.setFilterPriority(2);
    });
    expect(result.current.filters.filterPriority).toBe(2);
  });

  it('reset restores all defaults', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => {
      result.current.setSort('priority');
      result.current.setFilterType('assignment');
      result.current.setFilterPriority(1);
      result.current.setFilterStatus('pending');
      result.current.setOverdueOnly(true);
      result.current.setGroupBy('project');
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.filters).toEqual({
      sort: 'createdAt',
      order: 'asc',
      filterType: '',
      filterPriority: null,
      filterStatus: '',
      overdueOnly: false,
      groupBy: 'none',
    });
  });

  it('toQueryParams returns empty object for all defaults', () => {
    const { result } = renderHook(() => useTaskFilters());
    expect(result.current.toQueryParams()).toEqual({});
  });

  it('toQueryParams includes non-default sort', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => {
      result.current.setSort('priority');
    });
    const params = result.current.toQueryParams();
    expect(params.sort).toBe('priority');
  });

  it('toQueryParams includes filterPriority as string "2"', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => {
      result.current.setFilterPriority(2);
    });
    const params = result.current.toQueryParams();
    expect(params.priority).toBe('2');
  });

  it('toQueryParams includes overdueOnly as "true"', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => {
      result.current.setOverdueOnly(true);
    });
    const params = result.current.toQueryParams();
    expect(params.overdueOnly).toBe('true');
  });

  it('setSortAndOrder directly sets sort field and order', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => { result.current.setSortAndOrder('priority', 'desc'); });
    expect(result.current.filters.sort).toBe('priority');
    expect(result.current.filters.order).toBe('desc');
  });

  it('toQueryParams does NOT include groupBy', () => {
    const { result } = renderHook(() => useTaskFilters());
    act(() => {
      result.current.setGroupBy('project');
    });
    const params = result.current.toQueryParams();
    expect(params.groupBy).toBeUndefined();
  });
});
