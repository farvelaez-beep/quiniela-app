import { createClient } from '@/lib/supabase/server';
import AdminResultsClient from './AdminResultsClient';

export default async function AdminResultsPage() {
  const supabase = await createClient();

  const { data: results } = await supabase
    .from('match_results')
    .select('match_id, home_score, away_score');

  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('is_locked, official_top_scorer, official_champion')
    .eq('id', 1)
    .single();

  const resultsMap: Record<string, { home_score: number; away_score: number }> = {};
  (results ?? []).forEach(r => { resultsMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score }; });

  return (
    <AdminResultsClient
      initialResults={resultsMap}
      initialLocked={settings?.is_locked ?? false}
      initialTopScorer={settings?.official_top_scorer ?? ''}
      initialChampion={settings?.official_champion ?? ''}
    />
  );
}
