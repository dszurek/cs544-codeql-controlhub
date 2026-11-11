import { redirect } from 'next/navigation';

export default function SomedayPage() {
  redirect('/plan?tab=someday');
}
