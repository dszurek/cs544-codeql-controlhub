import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/tasks';

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, color, icon, sortOrder } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const project = await createProject({
    name: name.trim(),
    color: typeof color === 'string' ? color : undefined,
    icon: typeof icon === 'string' ? icon : undefined,
    sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
  });
  return NextResponse.json({ project }, { status: 201 });
}
