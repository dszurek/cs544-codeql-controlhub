import { render, screen, waitFor } from '@testing-library/react';
import { MailBadgesWidget } from '@/components/dashboard/MailBadgesWidget';

function mockFetch(response: { ok: boolean; data: unknown }) {
  vi.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({
      ok: response.ok,
      json: () => Promise.resolve(response.data),
    } as Response),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MailBadgesWidget', () => {
  it('renders loading state initially', () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
    render(<MailBadgesWidget />);
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('renders unread counts from insights API', async () => {
    mockFetch({ ok: true, data: { outlook: 5, gmail: 12, alerts: [] } });
    render(<MailBadgesWidget />);
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
    expect(screen.getByText('Outlook')).toBeInTheDocument();
    expect(screen.getByText('Gmail')).toBeInTheDocument();
  });

  it('renders zero counts', async () => {
    mockFetch({ ok: true, data: { outlook: 0, gmail: 0, alerts: [] } });
    render(<MailBadgesWidget />);
    await waitFor(() => {
      expect(screen.getAllByText('0')).toHaveLength(2);
    });
  });

  it('renders rule-triggered alerts', async () => {
    mockFetch({
      ok: true,
      data: {
        outlook: 1,
        gmail: 0,
        alerts: [
          {
            ruleId: 'r1',
            label: 'Boss',
            pattern: 'boss@example.com',
            count: 2,
            latest: {
              id: 'e1',
              subject: 'urgent',
              senderName: 'The Boss',
              senderEmail: 'boss@example.com',
              receivedAt: new Date().toISOString(),
            },
          },
        ],
      },
    });
    render(<MailBadgesWidget />);
    await waitFor(() => {
      expect(screen.getByText(/Boss · 2/)).toBeInTheDocument();
    });
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    mockFetch({ ok: false, data: {} });
    render(<MailBadgesWidget />);
    await waitFor(() => {
      expect(screen.getByText(/couldn't load mail/i)).toBeInTheDocument();
    });
  });

  it('renders error state when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    render(<MailBadgesWidget />);
    await waitFor(() => {
      expect(screen.getByText(/couldn't load mail/i)).toBeInTheDocument();
    });
  });

  it('each mail source row links to /mail', async () => {
    mockFetch({ ok: true, data: { outlook: 3, gmail: 7, alerts: [] } });
    render(<MailBadgesWidget />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/mail');
    });
  });
});
