import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

/**
 * Card Component
 *
 * A flexible container component for grouping related content.
 *
 * Features:
 * - Multiple variants (default, bordered, elevated)
 * - Padding sizes (sm, md, lg)
 * - Hover effects (optional)
 * - Semantic HTML (article, section, div)
 */

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hover?: boolean;
  as?: 'div' | 'section' | 'article';
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  as: Component = 'div',
  className,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-lg transition-shadow';

  const variants = {
    default: 'bg-white dark:bg-gray-900',
    bordered: 'border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
    elevated: 'bg-white shadow-md dark:bg-gray-900',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hover
    ? 'hover:shadow-lg cursor-pointer'
    : '';

  return (
    <Component
      className={cn(
        baseStyles,
        variants[variant],
        paddings[padding],
        hoverStyles,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Card Subcomponents for better composition
 */

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export function CardHeader({ title, description, children, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>}
      {children}
    </div>
  );
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn('text-sm', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div className={cn('mt-4 flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  );
}
