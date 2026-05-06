import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import KnockoutAdminClient from './KnockoutAdminClient';

export const dynamic = 'force-dynamic';

export default async function KnockoutAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) redirect('/dashboard');

  const { data: results } = await supabase.from('match_results').select('match_id, home_score, away_score');

  const resultsMap: Record<string, { home_score: number; away_score: number }> = {};
  (results ?? []).forEach(r => { resultsMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score }; });

  return <KnockoutAdminClient initialResults={resultsMap} />;
}
