'use client';

import type {
  CSSProperties,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from 'react';

const fieldBase: CSSProperties = {
  background: 'rgba(42, 47, 53, 0.55)',
  border: '1px solid rgba(216, 204, 192,0.18)',
  borderRadius: '8px',
  padding: '0.5rem 0.75rem',
  color: 'var(--beige-light)',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '0.9375rem',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 120ms ease, background 120ms ease',
};

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

function buttonStyles(variant: ButtonVariant, size: ButtonSize, disabled: boolean): CSSProperties {
  const pad = size === 'sm' ? '0.375rem 0.75rem' : '0.5rem 1rem';
  const font = size === 'sm' ? '0.8125rem' : '0.875rem';
  const base: CSSProperties = {
    padding: pad,
    fontSize: font,
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    fontFamily: 'inherit',
    transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
  };
  if (variant === 'primary') {
    return {
      ...base,
      background: 'rgba(176, 122, 79,0.28)',
      border: '1px solid rgba(176, 122, 79,0.55)',
      color: 'var(--beige-light)',
    };
  }
  if (variant === 'secondary') {
    return {
      ...base,
      background: 'rgba(216, 204, 192,0.06)',
      border: '1px solid rgba(216, 204, 192,0.2)',
      color: 'var(--beige-light)',
    };
  }
  if (variant === 'danger') {
    return {
      ...base,
      background: 'rgba(220,53,69,0.12)',
      border: '1px solid rgba(220,53,69,0.4)',
      color: '#f1aeb5',
    };
  }
  return {
    ...base,
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--muted)',
  };
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{ ...buttonStyles(variant, size, !!disabled), ...style }}
    >
      {children}
    </button>
  );
}

export function Input({ style, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} style={{ ...fieldBase, ...style }} />;
}

export function Textarea({ style, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} style={{ ...fieldBase, resize: 'vertical', ...style }} />;
}

export function Select({ style, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} style={{ ...fieldBase, ...style }}>
      {children}
    </select>
  );
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.6875rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--leather-light)',
  marginBottom: '0.375rem',
  fontWeight: 600,
};

export function Label({ style, children, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...rest} style={{ ...labelStyle, ...style }}>
      {children}
    </label>
  );
}

export function Field({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <div style={{ marginBottom: '1rem', ...style }}>{children}</div>;
}
