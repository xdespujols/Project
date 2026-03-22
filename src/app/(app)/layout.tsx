import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/layout/topbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="h-screen flex flex-col">
      <Topbar userName={session.user?.name} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
