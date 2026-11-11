import { redirect } from 'next/navigation';

// Tasks now live on the Plan surface; /tasks/[id] detail pages remain.
export default function TasksPage() {
  redirect('/plan');
}
