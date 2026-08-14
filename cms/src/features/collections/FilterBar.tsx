import { Select } from '../../components/ui/Select';
import type { CollectionFilter } from './types';

export interface FilterBarProps<T> {
  filters: CollectionFilter<T>[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  className?: string;
}

/** One Select per declared filter (spec §11) – "Status", "Division", etc. */
export function FilterBar<T>({ filters, values, onChange, className }: FilterBarProps<T>) {
  if (filters.length === 0) return null;
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => {
          const selected = values[filter.id] ?? '';
          return (
            <Select
              key={filter.id}
              value={selected}
              onChange={(event) => onChange(filter.id, event.target.value)}
              aria-label={filter.label}
              className="w-auto min-w-0"
            >
              <option value="">{filter.label}: All</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          );
        })}
      </div>
    </div>
  );
}
