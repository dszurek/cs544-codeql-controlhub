import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

interface RepoEvent {
  type: string;
  repo: { name: string };
  payload: {
    commits?: Array<{ message: string; sha: string }>;
    ref?: string;
  };
  created_at: string;
}

interface PullRequestItem {
  title: string;
  html_url: string;
  repository_url: string;
  number: number;
  updated_at: string;
}

async function ghFetch<T>(url: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const { github_token: token, github_user: user } = await getSettings([
    'github_token',
    'github_user',
  ]);

  if (!token || !user) {
    return NextResponse.json({ configured: false });
  }

  const [events, prs] = await Promise.all([
    ghFetch<RepoEvent[]>(
      `https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=30`,
      token,
    ),
    ghFetch<{ total_count: number; items: PullRequestItem[] }>(
      `https://api.github.com/search/issues?q=is:pr+is:open+author:${encodeURIComponent(
        user,
      )}&per_page=5&sort=updated`,
      token,
    ),
  ]);

  const recentCommits: Array<{ repo: string; message: string; at: string }> = [];
  let pushCount = 0;
  if (events) {
    for (const e of events) {
      if (e.type === 'PushEvent' && e.payload.commits) {
        pushCount += e.payload.commits.length;
        for (const c of e.payload.commits.slice(0, 1)) {
          recentCommits.push({
            repo: e.repo.name,
            message: c.message.split('\n')[0].slice(0, 80),
            at: e.created_at,
          });
        }
      }
    }
  }

  const openPRs = prs
    ? prs.items.map((pr) => ({
        title: pr.title,
        url: pr.html_url,
        repo: pr.repository_url.split('/').slice(-2).join('/'),
        number: pr.number,
      }))
    : [];

  return NextResponse.json({
    configured: true,
    user,
    pushCount,
    recentCommits: recentCommits.slice(0, 4),
    openPRs,
    openPRCount: prs?.total_count ?? 0,
  });
}
