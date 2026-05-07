import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardHeader from '@/components/DashboardHeader';
import { isEffectivelyLocked } from '@/lib/lock';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_admin')
    .eq('id', user.id)
    .single();

  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('is_locked, lock_at')
    .eq('id', 1)
    .single();

  const locked = isEffectivelyLocked(settings);

  return (
    <div className="min-h-screen">
      <DashboardHeader
        displayName={profile?.display_name || user.email || 'Usuario'}
        isAdmin={profile?.is_admin ?? false}
        isLocked={locked}
        lockAt={settings?.lock_at ?? null}
      />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
