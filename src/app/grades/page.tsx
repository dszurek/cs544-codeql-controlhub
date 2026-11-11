import { redirect } from 'next/navigation';

export default function GradesPage() {
  redirect('/library?tab=grades');
}
