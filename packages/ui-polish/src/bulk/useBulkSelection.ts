import { useCallback, useMemo, useState } from 'react';

export interface BulkSelectionApi<T> {
  selected: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: () => void;
  clear: () => void;
  selectedItems: T[];
  allSelected: boolean;
  someSelected: boolean;
  count: number;
}

interface Options<T> {
  items: T[];
  getId: (item: T) => string;
}

/** הוק לניהול בחירת רב — מתאים לטבלאות/רשימות. */
export function useBulkSelection<T>({ items, getId }: Options<T>): BulkSelectionApi<T> {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map(getId)));
  }, [items, getId]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(getId(i))),
    [items, selected, getId],
  );

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && !allSelected;

  return {
    selected,
    isSelected,
    toggle,
    selectAll,
    clear,
    selectedItems,
    allSelected,
    someSelected,
    count: selected.size,
  };
}
