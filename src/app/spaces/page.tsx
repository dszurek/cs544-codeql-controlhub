import { SurfaceTabs } from '@/components/ui/SurfaceTabs';
import { SpacesView } from '@/components/spaces/SpacesView';
import { RoutinesView } from '@/components/spaces/RoutinesView';
import { HomeAssistantPanel } from '@/components/spaces/HomeAssistantPanel';

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return (
    <SurfaceTabs
      initialTab={tab}
      tabs={[
        { id: 'devices', label: 'Devices', content: <SpacesView /> },
        { id: 'routines', label: 'Routines', content: <RoutinesView /> },
        { id: 'ha', label: 'Home Assistant', content: <HomeAssistantPanel /> },
      ]}
    />
  );
}
