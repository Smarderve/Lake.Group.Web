import { Icon } from '@iconify/react';
import magnify from '@iconify-icons/mdi/magnify';
import { Input } from '../../components/ui/Input';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Debounced search field (spec §11) – the parent owns the debounce via useCollection. */
export function SearchBar({ value, onChange, placeholder = 'Search…', className }: SearchBarProps) {
  return (
    <div className={className}>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        leftAdornment={<Icon icon={magnify} className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
      />
    </div>
  );
}
