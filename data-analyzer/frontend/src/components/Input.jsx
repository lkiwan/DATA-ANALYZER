import { clsx } from 'clsx';

const Input = ({ className, type = 'text', ...props }) => {
  return (
    <input
      type={type}
      className={clsx(
        'w-full px-4 py-2.5 rounded-lg',
        'bg-input border border-border',
        'text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
};

export default Input;
