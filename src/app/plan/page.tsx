import { SurfaceTabs } from '@/components/ui/SurfaceTabs';
import { HorizonView } from '@/components/plan/HorizonView';
import { TasksView } from '@/components/tasks/TasksView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { SomedayView } from '@/components/someday/SomedayView';

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return (
    <SurfaceTabs
      initialTab={tab}
      tabs={[
        { id: 'horizon', label: 'Horizon', content: <HorizonView /> },
        { id: 'backlog', label: 'Backlog', content: <TasksView /> },
        { id: 'calendar', label: 'Calendar', content: <CalendarView /> },
        { id: 'someday', label: 'Someday', content: <SomedayView /> },
      ]}
    />
  );
}
