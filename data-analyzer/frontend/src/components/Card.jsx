import { clsx } from 'clsx';

export const Card = ({ children, className, glow = false, ...props }) => {
  return (
    <div
      className={clsx(
        'glass-card rounded-xl p-6',
        glow && 'glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className, ...props }) => {
  return (
    <div className={clsx('mb-4', className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className, neon = false, ...props }) => {
  return (
    <h2
      className={clsx(
        'text-2xl font-bold',
        neon ? 'text-gradient' : 'text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
};

export const CardDescription = ({ children, className, ...props }) => {
  return (
    <p
      className={clsx('text-muted-foreground mt-2', className)}
      {...props}
    >
      {children}
    </p>
  );
};

export const CardContent = ({ children, className, ...props }) => {
  return (
    <div className={clsx('space-y-4', className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className, ...props }) => {
  return (
    <div className={clsx('mt-6 flex items-center gap-4', className)} {...props}>
      {children}
    </div>
  );
};
