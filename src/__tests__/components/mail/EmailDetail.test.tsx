import { render, screen, fireEvent } from '@testing-library/react';
import { EmailDetail } from '@/components/mail/EmailDetail';
import type { EmailData } from '@/components/mail/EmailList';

global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

const unreadEmail: EmailData = {
  id: 'e1',
  subject: 'Test Subject',
  senderName: 'Alice',
  senderEmail: 'alice@example.com',
  preview: 'Preview text here',
  isRead: false,
  receivedAt: new Date(Date.now() - 3600000).toISOString(),
  source: 'outlook',
};

const readEmail: EmailData = {
  ...unreadEmail,
  id: 'e2',
  isRead: true,
};

const noop = () => {};

describe('EmailDetail', () => {
  it('shows "Select an email" message when email is null', () => {
    render(<EmailDetail email={null} onMarkRead={noop} />);
    expect(screen.getByText('Select an email to read it')).toBeInTheDocument();
  });

  it('shows email subject and sender when email provided', () => {
    render(<EmailDetail email={unreadEmail} onMarkRead={noop} />);
    expect(screen.getByText('Test Subject')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows "Mark as read" button for unread email', () => {
    render(<EmailDetail email={unreadEmail} onMarkRead={noop} />);
    expect(screen.getByText('Mark as read')).toBeInTheDocument();
  });

  it('shows "Mark as unread" button for read email', () => {
    render(<EmailDetail email={readEmail} onMarkRead={noop} />);
    expect(screen.getByText('Mark as unread')).toBeInTheDocument();
  });

  it('calls onMarkRead when button clicked', () => {
    const onMarkRead = vi.fn();
    render(<EmailDetail email={unreadEmail} onMarkRead={onMarkRead} />);
    fireEvent.click(screen.getByText('Mark as read'));
    expect(onMarkRead).toHaveBeenCalledWith('e1', true);
  });
});
