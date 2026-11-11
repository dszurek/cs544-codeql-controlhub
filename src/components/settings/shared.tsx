import type { CSSProperties } from 'react';

/** Shared types, styles, and field primitive for the Settings managers. */

export type ConfiguredScene = {
  id: string;
  haEntityId: string;
  name: string;
  icon: string | null;
  sortOrder: number;
};

export type SectionState = { saving: boolean; saved: boolean; error: string | null };
export const idleSection: SectionState = { saving: false, saved: false, error: null };

export const buttonStyle: CSSProperties = {
  background: 'rgba(176, 122, 79, 0.25)',
  border: '1px solid rgba(176, 122, 79, 0.4)',
  borderRadius: '6px',
  color: 'var(--leather-light)',
  fontSize: '0.8125rem',
  padding: '0.4375rem 1rem',
  cursor: 'pointer',
  letterSpacing: '0.03em',
};

export const inputStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(42, 47, 53, 0.55)',
  border: '1px solid rgba(216, 204, 192, 0.15)',
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  color: 'var(--beige-light)',
  fontSize: '0.875rem',
  outline: 'none',
};

export function SettingField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={name}
        style={{
          display: 'block',
          fontSize: '0.6875rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--leather-light)',
          marginBottom: '0.375rem',
        }}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle }}
      />
    </div>
  );
}
