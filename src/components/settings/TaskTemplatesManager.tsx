'use client';

import { useEffect, useState } from 'react';

type TaskTemplate = {
  id: string;
  name: string;
  description: string | null;
  items: Array<Record<string, unknown>>;
};

export function TaskTemplatesManager() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [itemsJson, setItemsJson] = useState(
    '[\n  { "title": "Step 1", "priority": 2 },\n  { "title": "Step 2", "priority": 3, "blockerIndices": [0] }\n]',
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch('/api/task-templates')
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch(() => setError('Failed to load templates'));
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName('');
    setDescription('');
    setItemsJson('[]');
    setEditingId(null);
  }

  async function save() {
    setError(null);
    let items: unknown;
    try {
      items = JSON.parse(itemsJson);
    } catch {
      setError('Items must be valid JSON');
      return;
    }
    if (!Array.isArray(items)) {
      setError('Items must be a JSON array');
      return;
    }
    try {
      const url = editingId ? `/api/task-templates/${editingId}` : '/api/task-templates';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null, items }),
      });
      if (!res.ok) throw new Error('Failed to save');
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  async function remove(id: string) {
    await fetch(`/api/task-templates/${id}`, { method: 'DELETE' });
    load();
  }

  function editTemplate(t: TaskTemplate) {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description ?? '');
    setItemsJson(JSON.stringify(t.items, null, 2));
  }

  async function apply(id: string) {
    await fetch(`/api/task-templates/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anchorDate: new Date().toISOString() }),
    });
    // No visible feedback here — user can confirm on tasks page
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(42, 47, 53, 0.55)',
    border: '1px solid rgba(216, 204, 192,0.15)',
    borderRadius: 6,
    padding: '0.5rem 0.75rem',
    color: 'var(--beige-light)',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '0.875rem',
  };

  const btnStyle: React.CSSProperties = {
    background: 'rgba(176, 122, 79,0.3)',
    border: '1px solid rgba(176, 122, 79,0.5)',
    color: 'var(--leather-light)',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  };

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
        Save recurring task sequences. <code>parentIndex</code> and <code>blockerIndices</code> reference earlier items by position. <code>dueOffsetDays</code> is days from the apply date.
      </p>

      {templates.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>No templates yet.</p>
      )}

      {templates.map((t) => (
        <div
          key={t.id}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid rgba(216, 204, 192,0.1)',
            borderRadius: 6,
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ color: 'var(--beige-light)', fontSize: '0.875rem', flex: 1 }}>
            {t.name} <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>({t.items.length} items)</span>
          </span>
          <button onClick={() => apply(t.id)} style={btnStyle}>Apply now</button>
          <button onClick={() => editTemplate(t)} style={btnStyle}>Edit</button>
          <button
            onClick={() => remove(t.id)}
            style={{ ...btnStyle, color: '#dc3545', borderColor: 'rgba(220,53,69,0.4)', background: 'rgba(220,53,69,0.1)' }}
          >
            Delete
          </button>
        </div>
      ))}

      <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(216, 204, 192,0.1)', paddingTop: '0.75rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--leather-light)', marginTop: 0 }}>
          {editingId ? 'Edit template' : 'New template'}
        </h3>
        <div style={{ marginBottom: '0.5rem' }}>
          <input style={inputStyle} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <input style={inputStyle} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8125rem' }}
            rows={10}
            value={itemsJson}
            onChange={(e) => setItemsJson(e.target.value)}
          />
        </div>
        <button onClick={save} disabled={!name.trim()} style={{ ...btnStyle, padding: '6px 14px' }}>
          {editingId ? 'Save changes' : 'Create template'}
        </button>
        {editingId && (
          <button onClick={resetForm} style={{ ...btnStyle, marginLeft: '0.5rem', background: 'none', color: 'var(--muted)' }}>
            Cancel
          </button>
        )}
        {error && <p style={{ color: '#dc3545', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>}
      </div>
    </div>
  );
}

