import { clsx } from 'clsx';

export const Button = ({
  children,
  variant = 'neon',
  size = 'md',
  disabled = false,
  loading = false,
  className,
  ...props
}) => {
  const baseStyles = 'rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2';

  const variants = {
    neon: 'neon-button',
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'neon-border-purple bg-transparent text-secondary hover:bg-secondary/10',
    accent: 'neon-border-pink bg-transparent text-accent hover:bg-accent/10',
    ghost: 'hover:bg-primary/10 text-foreground',
    danger: 'bg-destructive text-destructive-foreground hover:opacity-90'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg',
    xl: 'px-10 py-4 text-xl'
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        loading && 'cursor-wait',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};
