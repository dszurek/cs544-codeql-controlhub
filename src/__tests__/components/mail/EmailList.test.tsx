import { render, screen, fireEvent } from '@testing-library/react';
import { EmailList } from '@/components/mail/EmailList';
import type { EmailData } from '@/components/mail/EmailList';

const emails: EmailData[] = [
  {
    id: 'e1',
    subject: 'Hello',
    senderName: 'Alice',
    senderEmail: 'alice@example.com',
    preview: 'Hey there',
    isRead: false,
    receivedAt: new Date(Date.now() - 3600000).toISOString(),
    source: 'outlook',
  },
  {
    id: 'e2',
    subject: 'Meeting',
    senderName: 'Bob',
    senderEmail: 'bob@example.com',
    preview: null,
    isRead: true,
    receivedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    source: 'gmail',
  },
];

const noop = () => {};

describe('EmailList', () => {
  it('renders email subjects', () => {
    render(<EmailList emails={emails} selectedId={null} onSelect={noop} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Meeting')).toBeInTheDocument();
  });

  it('calls onSelect with the correct email when clicked', () => {
    const onSelect = vi.fn();
    render(<EmailList emails={emails} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Hello'));
    expect(onSelect).toHaveBeenCalledWith(emails[0]);
  });

  it('shows an empty state when there are no emails', () => {
    render(<EmailList emails={[]} selectedId={null} onSelect={noop} />);
    expect(screen.getByText('Nothing in this stream.')).toBeInTheDocument();
  });

  it('shows source chip for outlook email', () => {
    render(<EmailList emails={emails} selectedId={null} onSelect={noop} />);
    expect(screen.getByText('outlook')).toBeInTheDocument();
  });

  it('shows source chip for gmail email', () => {
    render(<EmailList emails={emails} selectedId={null} onSelect={noop} />);
    expect(screen.getByText('gmail')).toBeInTheDocument();
  });

  it('marks unread rows with a dot and unread styling', () => {
    render(<EmailList emails={emails} selectedId={null} onSelect={noop} />);
    expect(screen.getByLabelText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Alice').closest('.stream-row')).toHaveClass('unread');
    expect(screen.getByText('Bob').closest('.stream-row')).toHaveClass('read');
  });
});
