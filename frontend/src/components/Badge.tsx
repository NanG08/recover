// src/components/Badge.tsx
import React from 'react';
import clsx from 'clsx';

type Props = {
  children: React.ReactNode;
  variant?: 'default' | 'ice' | 'success' | 'error';
  onClick?: () => void;
};

const Badge: React.FC<Props> = ({ children, variant = 'default', onClick }) => {
  const base = 'px-2 py-1 text-xs font-mono border rounded';
  const variantClasses = {
    default: 'bg-bg-surface text-text-secondary border-border',
    ice: 'bg-accent-ice text-bg-base border-accent-ice',
    success: 'bg-success text-bg-base border-success',
    error: 'bg-error text-bg-base border-error',
  };
  return (
    <span className={clsx(base, variantClasses[variant])} onClick={onClick}>{children}</span>
  );
};

export { Badge };
export default Badge;
