import { SurfaceTabs } from '@/components/ui/SurfaceTabs';
import { DailyNoteView } from '@/components/notes/DailyNoteView';
import { GradesView } from '@/components/grades/GradesView';
import { ForgeView } from '@/components/forge/ForgeView';

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return (
    <SurfaceTabs
      initialTab={tab}
      tabs={[
        {
          id: 'notes',
          label: 'Notes',
          content: (
            <div style={{ maxWidth: 820, margin: '0 auto' }}>
              <DailyNoteView />
            </div>
          ),
        },
        { id: 'grades', label: 'Grades', content: <GradesView /> },
        { id: 'forge', label: 'Forge', content: <ForgeView /> },
      ]}
    />
  );
}
