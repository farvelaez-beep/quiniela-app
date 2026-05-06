import { createClient } from '@/lib/supabase/server';
import BonusClient from './BonusClient';

export default async function BonusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: bonus } = await supabase
    .from('bonus_predictions')
    .select('top_scorer, champion')
    .eq('user_id', user!.id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('is_locked')
    .eq('id', 1)
    .single();

  return (
    <BonusClient
      initial={{ top_scorer: bonus?.top_scorer ?? '', champion: bonus?.champion ?? '' }}
      locked={settings?.is_locked ?? false}
      userId={user!.id}
    />
  );
}
