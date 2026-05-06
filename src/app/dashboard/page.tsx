import { createClient } from '@/lib/supabase/server';
import GroupStageClient from './GroupStageClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: predictions } = await supabase
    .from('match_predictions')
    .select('match_id, home_score, away_score')
    .eq('user_id', user!.id);

  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('is_locked')
    .eq('id', 1)
    .single();

  const predMap: Record<string, { home_score: number; away_score: number }> = {};
  (predictions ?? []).forEach(p => {
    predMap[p.match_id] = { home_score: p.home_score, away_score: p.away_score };
  });

  return <GroupStageClient initialPredictions={predMap} locked={settings?.is_locked ?? false} userId={user!.id} />;
}
