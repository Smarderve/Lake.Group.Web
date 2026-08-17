import { cn } from '../../utils/cn';
import lakeMark from '../../assets/lake-mark.png';

export interface BrandMarkProps {
  size?: 'sm' | 'md';
  iconOnly?: boolean;
  className?: string;
}

/**
 * The real Lake Group wave mark (source: assets/images/logos/LAKE_LOGO_LAKE_ONLY.png
 * from the public site). Rendered as an image so brand colors stay exact.
 * Decorative by default – the adjacent wordmark carries the accessible name.
 */
export function BrandMark({ size = 'md', iconOnly = false, className }: BrandMarkProps) {
  const sizes = {
    sm: 'h-7',
    md: 'h-9',
  };

  if (iconOnly) {
    return (
      <span
        aria-hidden="true"
        className={cn('block aspect-square shrink-0 overflow-hidden', sizes[size], className)}
      >
        <img src={lakeMark} alt="" className="h-full w-auto max-w-none object-contain object-left" />
      </span>
    );
  }

  return (
    <img
      src={lakeMark}
      alt=""
      aria-hidden="true"
      className={cn('w-auto shrink-0 object-contain', sizes[size], className)}
    />
  );
}
