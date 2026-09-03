import React from 'react'
import clsx from 'clsx'

type Props = {
  children: React.ReactNode
  variant?: 'default' | 'ice' | 'success' | 'error'
  onClick?: () => void
}

export const Badge: React.FC<Props> = ({ children, variant = 'default', onClick }) => {
  const base = 'inline-flex items-center px-2 py-0.5 text-xs font-mono border'
  const variants = {
    default: 'bg-bg-surface text-text-secondary border-border',
    ice:     'bg-accent-ice/10 text-accent-ice border-accent-ice/40',
    success: 'bg-success/10 text-success border-success/40',
    error:   'bg-error/10 text-error border-error/40',
  }
  return (
    <span
      className={clsx(base, variants[variant], onClick && 'cursor-pointer hover:opacity-80')}
      onClick={onClick}
    >
      {children}
    </span>
  )
}

export default Badge
