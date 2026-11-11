import { GET, POST } from '@/app/api/projects/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/tasks', () => ({
  getProjects: vi.fn().mockResolvedValue([{ id: 'p-1', name: 'Work', color: '#b07a4f', sortOrder: 0 }]),
  createProject: vi.fn().mockResolvedValue({ id: 'p-2', name: 'Personal', color: '#b07a4f', sortOrder: 0 }),
}));

import { getProjects, createProject } from '@/lib/tasks';

describe('GET /api/projects', () => {
  it('returns 200 with { projects: [...] }', async () => {
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty('projects');
    expect(json.projects).toEqual([{ id: 'p-1', name: 'Work', color: '#b07a4f', sortOrder: 0 }]);
    expect(getProjects).toHaveBeenCalled();
  });
});

describe('POST /api/projects', () => {
  it('with { name: "Personal" } → returns 201 with { project: ... }', async () => {
    const req = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Personal' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json).toHaveProperty('project');
    expect(json.project.name).toBe('Personal');
    expect(createProject).toHaveBeenCalledWith({ name: 'Personal', color: undefined, icon: undefined, sortOrder: undefined });
  });

  it('missing name → returns 400', async () => {
    const req = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ color: '#ff0000' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'name is required' });
  });
});
