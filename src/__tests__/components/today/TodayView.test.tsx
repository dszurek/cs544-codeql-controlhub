import { render, screen } from '@testing-library/react';

// Fully synthetic mock — importing the real module pulls in settings → db,
// which throws without DATABASE_URL in the test environment. vi.hoisted
// makes the ids available inside the hoisted vi.mock factory.
const ALL_WIDGET_IDS = vi.hoisted(() => [
  'signals', 'clock', 'weather', 'briefing', 'shutdown', 'todayEvents', 'todayTasks',
  'productivity', 'focus', 'habits', 'dailyNote', 'timeline', 'slipping',
  'mail', 'github', 'scenes',
]);

vi.mock('@/lib/dashboardWidgets', () => ({
  getWidgetVisibility: vi
    .fn()
    .mockResolvedValue(Object.fromEntries(ALL_WIDGET_IDS.map((id) => [id, true]))),
  getWidgetOrder: vi.fn().mockResolvedValue(ALL_WIDGET_IDS),
  sortByOrder: <T,>(items: T[]) => items, // order is identity for this test
}));

vi.mock('@/components/today/TodayHero', () => ({
  TodayHero: () => <div data-testid="hero-mock" />,
}));
vi.mock('@/components/today/DayTimeline', () => ({
  DayTimeline: () => <div data-testid="day-timeline-mock" />,
}));
vi.mock('@/components/dashboard/WeatherWidget', () => ({
  WeatherWidget: () => <div data-testid="weather-mock" />,
}));
vi.mock('@/components/dashboard/TodayTasksWidget', () => ({
  TodayTasksWidget: () => <div data-testid="today-tasks-mock" />,
}));
vi.mock('@/components/dashboard/MailBadgesWidget', () => ({
  MailBadgesWidget: () => <div data-testid="mail-badges-mock" />,
}));
vi.mock('@/components/dashboard/QuickScenesWidget', () => ({
  QuickScenesWidget: () => <div data-testid="quick-scenes-mock" />,
}));
vi.mock('@/components/dashboard/ProductivityWidget', () => ({
  ProductivityWidget: () => <div data-testid="productivity-mock" />,
}));
vi.mock('@/components/dashboard/FocusWidget', () => ({
  FocusWidget: () => <div data-testid="focus-mock" />,
}));
vi.mock('@/components/dashboard/HabitsWidget', () => ({
  HabitsWidget: () => <div data-testid="habits-mock" />,
}));
vi.mock('@/components/dashboard/GitHubWidget', () => ({
  GitHubWidget: () => <div data-testid="github-mock" />,
}));
vi.mock('@/components/dashboard/BriefingWidget', () => ({
  BriefingWidget: () => <div data-testid="briefing-mock" />,
}));
vi.mock('@/components/dashboard/SignalsWidget', () => ({
  SignalsWidget: () => <div data-testid="signals-mock" />,
}));
vi.mock('@/components/dashboard/ShutdownWidget', () => ({
  ShutdownWidget: () => <div data-testid="shutdown-mock" />,
}));
vi.mock('@/components/dashboard/TimelineWidget', () => ({
  TimelineWidget: () => <div data-testid="timeline-mock" />,
}));
vi.mock('@/components/dashboard/SlippingWidget', () => ({
  SlippingWidget: () => <div data-testid="slipping-mock" />,
}));
vi.mock('@/components/notes/DailyNoteView', () => ({
  DailyNoteView: () => <div data-testid="daily-note-mock" />,
}));

import { TodayView } from '@/components/today/TodayView';

describe('TodayView', () => {
  it('renders hero, timeline, rail, and fold widgets when all visible', async () => {
    render(await TodayView());
    // hero + centerpiece
    expect(screen.getByTestId('hero-mock')).toBeInTheDocument();
    expect(screen.getByTestId('day-timeline-mock')).toBeInTheDocument();
    // rail
    expect(screen.getByTestId('signals-mock')).toBeInTheDocument();
    expect(screen.getByTestId('briefing-mock')).toBeInTheDocument();
    expect(screen.getByTestId('today-tasks-mock')).toBeInTheDocument();
    expect(screen.getByTestId('weather-mock')).toBeInTheDocument();
    expect(screen.getByTestId('mail-badges-mock')).toBeInTheDocument();
    expect(screen.getByTestId('quick-scenes-mock')).toBeInTheDocument();
    // below the fold
    expect(screen.getByTestId('slipping-mock')).toBeInTheDocument();
    expect(screen.getByTestId('shutdown-mock')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-mock')).toBeInTheDocument();
    expect(screen.getByTestId('productivity-mock')).toBeInTheDocument();
    expect(screen.getByTestId('focus-mock')).toBeInTheDocument();
    expect(screen.getByTestId('habits-mock')).toBeInTheDocument();
    expect(screen.getByTestId('daily-note-mock')).toBeInTheDocument();
    expect(screen.getByTestId('github-mock')).toBeInTheDocument();
  });
});
