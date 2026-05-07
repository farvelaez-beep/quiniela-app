import { createClient } from '@/lib/supabase/server';
import GroupStageClient from './GroupStageClient';
import { isEffectivelyLocked } from '@/lib/lock';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: predictions },
    { data: results },
    { data: settings },
    { data: userTiebreakers },
    { data: officialTiebreakers },
  ] = await Promise.all([
    supabase.from('match_predictions')
      .select('match_id, home_score, away_score')
      .eq('user_id', user!.id),
    supabase.from('match_results').select('match_id, home_score, away_score'),
    supabase.from('tournament_settings').select('is_locked, lock_at').eq('id', 1).single(),
    supabase.from('user_group_tiebreaker').select('group_key, ranking').eq('user_id', user!.id),
    supabase.from('official_group_tiebreaker').select('group_key, ranking'),
  ]);

  const predMap: Record<string, { home_score: number; away_score: number }> = {};
  (predictions ?? []).forEach(p => {
    predMap[p.match_id] = { home_score: p.home_score, away_score: p.away_score };
  });

  const resultsMap: Record<string, { home_score: number; away_score: number }> = {};
  (results ?? []).forEach(r => {
    resultsMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score };
  });

  const userTbMap: Record<string, string[]> = {};
  (userTiebreakers ?? []).forEach((t: any) => { userTbMap[t.group_key] = t.ranking as string[]; });

  const officialTbMap: Record<string, string[]> = {};
  (officialTiebreakers ?? []).forEach((t: any) => { officialTbMap[t.group_key] = t.ranking as string[]; });

  return (
    <GroupStageClient
      initialPredictions={predMap}
      results={resultsMap}
      locked={isEffectivelyLocked(settings)}
      userId={user!.id}
      userTiebreakers={userTbMap}
      officialTiebreakers={officialTbMap}
    />
  );
}
