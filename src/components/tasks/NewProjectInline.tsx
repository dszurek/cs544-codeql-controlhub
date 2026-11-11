'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui/primitives';

interface NewProjectInlineProps {
  onCreated: (project: { id: string; name: string }) => void;
}

export function NewProjectInline({ onCreated }: NewProjectInlineProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error('Request failed');
      const { project } = await res.json();
      onCreated(project);
      setName('');
      setEditing(false);
    } catch {
      setError('Could not create project.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setEditing(true)}
        style={{ marginBottom: '0.75rem' }}
      >
        + New project
      </Button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') {
            setEditing(false);
            setName('');
            setError(null);
          }
        }}
        placeholder="Project name"
        disabled={submitting}
        style={{ flex: 1, maxWidth: 320 }}
      />
      <Button onClick={submit} disabled={submitting || !name.trim()} size="sm">
        Create
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setEditing(false);
          setName('');
          setError(null);
        }}
        disabled={submitting}
      >
        Cancel
      </Button>
      {error && (
        <span style={{ color: '#dc3545', fontSize: '0.75rem' }}>{error}</span>
      )}
    </div>
  );
}
