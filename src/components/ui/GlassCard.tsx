import type { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  style?: CSSProperties;
}

export function GlassCard({
  children,
  className = '',
  interactive = false,
  style,
}: GlassCardProps) {
  const classes = ['glass-card'];
  if (interactive) classes.push('interactive');
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')} style={style}>
      {children}
    </div>
  );
}
