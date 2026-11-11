import { getWidgetVisibility, getWidgetOrder, sortByOrder } from '@/lib/dashboardWidgets';
import { TodayHero } from './TodayHero';
import { DayTimeline } from './DayTimeline';
import { SignalsWidget } from '@/components/dashboard/SignalsWidget';
import { BriefingWidget } from '@/components/dashboard/BriefingWidget';
import { TodayTasksWidget } from '@/components/dashboard/TodayTasksWidget';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';
import { MailBadgesWidget } from '@/components/dashboard/MailBadgesWidget';
import { QuickScenesWidget } from '@/components/dashboard/QuickScenesWidget';
import { SlippingWidget } from '@/components/dashboard/SlippingWidget';
import { ShutdownWidget } from '@/components/dashboard/ShutdownWidget';
import { TimelineWidget } from '@/components/dashboard/TimelineWidget';
import { ProductivityWidget } from '@/components/dashboard/ProductivityWidget';
import { FocusWidget } from '@/components/dashboard/FocusWidget';
import { HabitsWidget } from '@/components/dashboard/HabitsWidget';
import { GitHubWidget } from '@/components/dashboard/GitHubWidget';
import { DailyNoteView } from '@/components/notes/DailyNoteView';

/**
 * Today — one opinionated composition instead of a widget stack.
 * First viewport: hero (greeting + clock), the mission timeline, and a
 * compact rail. Every other instrument lives below the fold. Widget
 * visibility settings are respected throughout.
 */
export async function TodayView() {
  const [v, order] = await Promise.all([getWidgetVisibility(), getWidgetOrder()]);

  const rail = sortByOrder(
    [
      v.signals !== false && { id: 'signals', node: <SignalsWidget /> },
      v.briefing && { id: 'briefing', node: <BriefingWidget /> },
      v.todayTasks && { id: 'todayTasks', node: <TodayTasksWidget /> },
      v.weather && { id: 'weather', node: <WeatherWidget /> },
      v.mail && { id: 'mail', node: <MailBadgesWidget /> },
      v.scenes && { id: 'scenes', node: <QuickScenesWidget /> },
    ].filter(Boolean) as { id: string; node: React.ReactNode }[],
    order,
  );

  const fold = sortByOrder(
    [
      v.slipping && { id: 'slipping', node: <SlippingWidget /> },
      v.shutdown && { id: 'shutdown', node: <ShutdownWidget /> },
      v.timeline && { id: 'timeline', node: <TimelineWidget /> },
      v.productivity && { id: 'productivity', node: <ProductivityWidget /> },
      v.focus && { id: 'focus', node: <FocusWidget /> },
      v.habits && { id: 'habits', node: <HabitsWidget /> },
      v.dailyNote && { id: 'dailyNote', node: <DailyNoteView compact /> },
      v.github && { id: 'github', node: <GitHubWidget /> },
    ].filter(Boolean) as { id: string; node: React.ReactNode }[],
    order,
  );

  return (
    <div className="today-grid">
      <TodayHero showClock={v.clock !== false} />

      <div className="today-main">
        {v.todayEvents !== false && (
          <section className="tl-wrap glass-pane reveal" aria-label="Mission timeline">
            <DayTimeline />
          </section>
        )}
        <aside className="today-rail">
          {rail.map((w, i) => (
            <div key={w.id} className="reveal" style={{ ['--reveal-i' as string]: i + 1 }}>
              {w.node}
            </div>
          ))}
        </aside>
      </div>

      {fold.length > 0 && (
        <>
          <div className="fold-label">More instruments</div>
          <div className="today-fold">
            {fold.map((w, i) => (
              <div key={w.id} className="reveal" style={{ ['--reveal-i' as string]: i }}>
                {w.node}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
