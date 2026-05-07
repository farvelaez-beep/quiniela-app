import { createClient } from '@/lib/supabase/server';
import PlayersClient from './PlayersClient';

export default async function PlayersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name, full_name, phone_number, paid, is_admin, created_at')
    .order('created_at', { ascending: false });

  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('entry_fee, currency')
    .eq('id', 1)
    .single();

  return (
    <PlayersClient
      players={(profiles ?? []).map(p => ({
        id: p.id, email: p.email, name: p.display_name,
        fullName: p.full_name ?? null,
        phone: p.phone_number ?? '',
        paid: p.paid,
        isAdmin: p.is_admin, createdAt: p.created_at,
      }))}
      entryFee={settings?.entry_fee ?? 0}
      currency={settings?.currency ?? 'COP'}
    />
  );
}
