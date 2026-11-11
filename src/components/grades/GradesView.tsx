'use client';

import { useCallback, useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { ClassSummary } from '@/lib/grades';

interface CategoryDTO {
  id: string;
  name: string;
  weight: number;
}

interface AssignmentDTO {
  id: string;
  name: string;
  categoryId: string | null;
  pointsEarned: number | null;
  pointsPossible: number;
  dueDate: string | null;
  isUpcoming: boolean;
}

interface ClassDTO {
  id: string;
  name: string;
  code: string | null;
  creditHours: number;
  qualityPoints: number;
  categories: CategoryDTO[];
  assignments: AssignmentDTO[];
}

interface ApiResponse {
  classes: ClassDTO[];
  summaries: ClassSummary[];
  gpa: number | null;
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(42, 47, 53, 0.55)',
  border: '1px solid rgba(216, 204, 192,0.15)',
  borderRadius: 6,
  padding: '0.4rem 0.6rem',
  color: 'var(--beige-light)',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
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

const dangerBtn: React.CSSProperties = {
  ...btnStyle,
  background: 'rgba(220,53,69,0.15)',
  borderColor: 'rgba(220,53,69,0.4)',
  color: '#dc3545',
};

function formatPercent(pct: number | null): string {
  if (pct == null) return '—';
  return `${pct.toFixed(1)}%`;
}

export function GradesView() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassCredits, setNewClassCredits] = useState('3');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/grades/classes');
      if (!res.ok) throw new Error('Failed to load');
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addClass() {
    if (!newClassName.trim()) return;
    const credits = parseFloat(newClassCredits);
    await fetch('/api/grades/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newClassName.trim(),
        code: newClassCode.trim() || null,
        creditHours: isNaN(credits) ? 3 : credits,
      }),
    });
    setNewClassName('');
    setNewClassCode('');
    setNewClassCredits('3');
    load();
  }

  async function deleteClass(id: string) {
    await fetch(`/api/grades/classes/${id}`, { method: 'DELETE' });
    load();
  }

  async function patchClass(id: string, body: Record<string, unknown>) {
    await fetch(`/api/grades/classes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    load();
  }

  async function addCategory(classId: string, name: string, weight: number) {
    await fetch('/api/grades/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, name, weight }),
    });
    load();
  }

  async function patchCategory(id: string, body: Record<string, unknown>) {
    await fetch(`/api/grades/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    load();
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/grades/categories/${id}`, { method: 'DELETE' });
    load();
  }

  async function addAssignment(
    classId: string,
    body: {
      name: string;
      categoryId: string | null;
      pointsEarned: number | null;
      pointsPossible: number;
      dueDate: string | null;
      isUpcoming: boolean;
    },
  ) {
    await fetch('/api/grades/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, ...body }),
    });
    load();
  }

  async function patchAssignment(id: string, body: Record<string, unknown>) {
    await fetch(`/api/grades/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    load();
  }

  async function deleteAssignment(id: string) {
    await fetch(`/api/grades/assignments/${id}`, { method: 'DELETE' });
    load();
  }

  if (error) return <p style={{ color: '#dc3545' }}>{error}</p>;
  if (!data) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;

  return (
    <div>
      <div className="surface-head reveal">
        <h1 className="surface-title">Grades</h1>
        {data.gpa != null && (
          <span className="readout readout-lg glow-track glow-text">
            {data.gpa.toFixed(2)}
            <span className="readout-unit">GPA</span>
          </span>
        )}
      </div>

      {/* Add class */}
      <GlassCard>
        <h2
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '1rem',
            color: 'var(--beige-light)',
            marginBottom: '0.5rem',
          }}
        >
          Add class
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px auto', gap: '0.5rem' }}>
          <input
            placeholder="Class name"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Code (CS 101)"
            value={newClassCode}
            onChange={(e) => setNewClassCode(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Credits"
            type="number"
            step="0.5"
            min="0"
            value={newClassCredits}
            onChange={(e) => setNewClassCredits(e.target.value)}
            style={inputStyle}
          />
          <button onClick={addClass} style={btnStyle} disabled={!newClassName.trim()}>
            Add
          </button>
        </div>
      </GlassCard>

      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {data.classes.map((cls) => {
          const summary = data.summaries.find((s) => s.classId === cls.id);
          return (
            <ClassCard
              key={cls.id}
              cls={cls}
              summary={summary}
              onDeleteClass={() => deleteClass(cls.id)}
              onPatchClass={(body) => patchClass(cls.id, body)}
              onAddCategory={(name, weight) => addCategory(cls.id, name, weight)}
              onPatchCategory={patchCategory}
              onDeleteCategory={deleteCategory}
              onAddAssignment={(body) => addAssignment(cls.id, body)}
              onPatchAssignment={patchAssignment}
              onDeleteAssignment={deleteAssignment}
            />
          );
        })}
      </div>

      {data.classes.length === 0 && (
        <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>No classes yet. Add one above.</p>
      )}
    </div>
  );
}

interface ClassCardProps {
  cls: ClassDTO;
  summary?: ClassSummary;
  onDeleteClass: () => void;
  onPatchClass: (body: Record<string, unknown>) => void;
  onAddCategory: (name: string, weight: number) => void;
  onPatchCategory: (id: string, body: Record<string, unknown>) => void;
  onDeleteCategory: (id: string) => void;
  onAddAssignment: (body: {
    name: string;
    categoryId: string | null;
    pointsEarned: number | null;
    pointsPossible: number;
    dueDate: string | null;
    isUpcoming: boolean;
  }) => void;
  onPatchAssignment: (id: string, body: Record<string, unknown>) => void;
  onDeleteAssignment: (id: string) => void;
}

function ClassCard(props: ClassCardProps) {
  const { cls, summary } = props;
  const [catName, setCatName] = useState('');
  const [catWeight, setCatWeight] = useState('');
  const [showAddAssign, setShowAddAssign] = useState(false);
  const [assignName, setAssignName] = useState('');
  const [assignCategoryId, setAssignCategoryId] = useState('');
  const [assignEarned, setAssignEarned] = useState('');
  const [assignPossible, setAssignPossible] = useState('100');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignUpcoming, setAssignUpcoming] = useState(false);

  function submitCategory() {
    if (!catName.trim()) return;
    const w = parseFloat(catWeight);
    props.onAddCategory(catName.trim(), isNaN(w) ? 0 : w);
    setCatName('');
    setCatWeight('');
  }

  function submitAssignment() {
    if (!assignName.trim()) return;
    const earned = assignEarned === '' ? null : parseFloat(assignEarned);
    const possible = parseFloat(assignPossible);
    props.onAddAssignment({
      name: assignName.trim(),
      categoryId: assignCategoryId || null,
      pointsEarned: assignUpcoming ? null : earned,
      pointsPossible: isNaN(possible) ? 100 : possible,
      dueDate: assignDueDate ? new Date(assignDueDate + 'T12:00:00').toISOString() : null,
      isUpcoming: assignUpcoming,
    });
    setAssignName('');
    setAssignCategoryId('');
    setAssignEarned('');
    setAssignPossible('100');
    setAssignDueDate('');
    setAssignUpcoming(false);
    setShowAddAssign(false);
  }

  const gradedAssignments = cls.assignments.filter((a) => !a.isUpcoming);
  const upcomingAssignments = cls.assignments.filter((a) => a.isUpcoming);

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '1.125rem',
            color: 'var(--beige-light)',
            margin: 0,
            flex: 1,
          }}
        >
          {cls.name}
          {cls.code && (
            <span style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginLeft: '0.5rem' }}>
              {cls.code}
            </span>
          )}
        </h2>
        {summary?.currentPercent != null && (
          <span style={{ color: 'var(--leather-light)', fontSize: '1rem' }}>
            {formatPercent(summary.currentPercent)} ({summary.letterGrade})
          </span>
        )}
        <button onClick={props.onDeleteClass} style={dangerBtn}>
          Delete class
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
          Credits:
          <input
            type="number"
            step="0.5"
            min="0"
            defaultValue={cls.creditHours}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v !== cls.creditHours) props.onPatchClass({ creditHours: v });
            }}
            style={{ ...inputStyle, width: 70 }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
          Quality points:
          <input
            type="number"
            step="0.01"
            min="0"
            defaultValue={cls.qualityPoints}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v !== cls.qualityPoints) props.onPatchClass({ qualityPoints: v });
            }}
            style={{ ...inputStyle, width: 80 }}
          />
        </label>
      </div>

      {/* Categories */}
      <h3 style={{ fontSize: '0.8125rem', color: 'var(--leather-light)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Categories
      </h3>
      <div style={{ display: 'grid', gap: '0.375rem', marginBottom: '0.5rem' }}>
        {cls.categories.map((cat) => {
          const cs = summary?.categorySummaries.find((c) => c.categoryId === cat.id);
          return (
            <div
              key={cat.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 90px 1fr auto',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.375rem 0.5rem',
                background: 'rgba(42, 47, 53, 0.30)',
                border: '1px solid rgba(216, 204, 192,0.08)',
                borderRadius: 4,
              }}
            >
              <input
                defaultValue={cat.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== cat.name) {
                    props.onPatchCategory(cat.id, { name: e.target.value.trim() });
                  }
                }}
                style={inputStyle}
              />
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={cat.weight}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v !== cat.weight) props.onPatchCategory(cat.id, { weight: v });
                }}
                style={inputStyle}
              />
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                {cs && cs.percent != null ? `${formatPercent(cs.percent)} · ${cs.earned.toFixed(1)}/${cs.possible.toFixed(1)}` : '—'}
              </span>
              <button onClick={() => props.onDeleteCategory(cat.id)} style={dangerBtn}>
                ×
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px auto', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          placeholder="Category name"
          value={catName}
          onChange={(e) => setCatName(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Weight %"
          type="number"
          step="0.1"
          value={catWeight}
          onChange={(e) => setCatWeight(e.target.value)}
          style={inputStyle}
        />
        <button onClick={submitCategory} style={btnStyle}>
          Add category
        </button>
      </div>
      {summary && summary.uncategorizedWeight > 0 && summary.uncategorizedPercent != null && (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
          Uncategorized: {formatPercent(summary.uncategorizedPercent)} ({summary.uncategorizedWeight.toFixed(1)}% weight)
        </p>
      )}

      {/* Assignments */}
      <h3 style={{ fontSize: '0.8125rem', color: 'var(--leather-light)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Graded
      </h3>
      {gradedAssignments.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>None yet.</p>
      )}
      <div style={{ display: 'grid', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {gradedAssignments.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            categories={cls.categories}
            onPatch={(body) => props.onPatchAssignment(a.id, body)}
            onDelete={() => props.onDeleteAssignment(a.id)}
          />
        ))}
      </div>

      <h3 style={{ fontSize: '0.8125rem', color: 'var(--leather-light)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Upcoming
      </h3>
      {upcomingAssignments.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>None.</p>
      )}
      <div style={{ display: 'grid', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {upcomingAssignments.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            categories={cls.categories}
            onPatch={(body) => props.onPatchAssignment(a.id, body)}
            onDelete={() => props.onDeleteAssignment(a.id)}
          />
        ))}
      </div>

      {!showAddAssign ? (
        <button onClick={() => setShowAddAssign(true)} style={btnStyle}>
          + Add assignment
        </button>
      ) : (
        <div
          style={{
            border: '1px solid rgba(216, 204, 192,0.1)',
            borderRadius: 6,
            padding: '0.5rem',
            display: 'grid',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          <input
            placeholder="Assignment name"
            value={assignName}
            onChange={(e) => setAssignName(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <select
              value={assignCategoryId}
              onChange={(e) => setAssignCategoryId(e.target.value)}
              style={inputStyle}
            >
              <option value="">(no category)</option>
              {cls.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={assignUpcoming}
                onChange={(e) => setAssignUpcoming(e.target.checked)}
              />
              Upcoming (no grade yet)
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <input
              type="number"
              step="0.01"
              placeholder="Earned"
              value={assignEarned}
              onChange={(e) => setAssignEarned(e.target.value)}
              disabled={assignUpcoming}
              style={inputStyle}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Possible"
              value={assignPossible}
              onChange={(e) => setAssignPossible(e.target.value)}
              style={inputStyle}
            />
            <input
              type="date"
              value={assignDueDate}
              onChange={(e) => setAssignDueDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={submitAssignment} style={btnStyle}>Save</button>
            <button onClick={() => setShowAddAssign(false)} style={{ ...btnStyle, background: 'none', color: 'var(--muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

interface AssignmentRowProps {
  assignment: AssignmentDTO;
  categories: CategoryDTO[];
  onPatch: (body: Record<string, unknown>) => void;
  onDelete: () => void;
}

function AssignmentRow({ assignment, categories, onPatch, onDelete }: AssignmentRowProps) {
  const pct =
    !assignment.isUpcoming && assignment.pointsEarned != null && assignment.pointsPossible > 0
      ? (assignment.pointsEarned / assignment.pointsPossible) * 100
      : null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.2fr 70px 70px 90px 1fr auto',
        gap: '0.5rem',
        alignItems: 'center',
        padding: '0.3rem 0.4rem',
        background: 'rgba(42, 47, 53, 0.30)',
        border: '1px solid rgba(216, 204, 192,0.06)',
        borderRadius: 4,
      }}
    >
      <input
        defaultValue={assignment.name}
        onBlur={(e) => {
          if (e.target.value.trim() && e.target.value !== assignment.name) {
            onPatch({ name: e.target.value.trim() });
          }
        }}
        style={inputStyle}
      />
      <select
        defaultValue={assignment.categoryId ?? ''}
        onChange={(e) => onPatch({ categoryId: e.target.value || null })}
        style={inputStyle}
      >
        <option value="">(no category)</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input
        type="number"
        step="0.01"
        placeholder="Earned"
        defaultValue={assignment.pointsEarned ?? ''}
        disabled={assignment.isUpcoming}
        onBlur={(e) => {
          const v = e.target.value === '' ? null : parseFloat(e.target.value);
          onPatch({ pointsEarned: v });
        }}
        style={inputStyle}
      />
      <input
        type="number"
        step="0.01"
        defaultValue={assignment.pointsPossible}
        onBlur={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onPatch({ pointsPossible: v });
        }}
        style={inputStyle}
      />
      <input
        type="date"
        defaultValue={assignment.dueDate ? assignment.dueDate.slice(0, 10) : ''}
        onChange={(e) => onPatch({ dueDate: e.target.value || null })}
        style={inputStyle}
      />
      <span style={{ fontSize: '0.8125rem', color: pct == null ? 'var(--muted)' : 'var(--leather-light)' }}>
        {assignment.isUpcoming ? 'upcoming' : pct != null ? `${pct.toFixed(1)}%` : '—'}
      </span>
      <button onClick={onDelete} style={dangerBtn}>×</button>
    </div>
  );
}
