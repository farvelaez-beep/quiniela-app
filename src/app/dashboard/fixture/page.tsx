import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BracketTree from '@/components/BracketTree';

export const dynamic = 'force-dynamic';

export default async function FixturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="pb-24">
      <div className="mb-6">
        <h2 className="font-display text-5xl leading-none">FIXTURE</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Asi van quedando las llaves reales del Mundial. Se actualiza con cada resultado que se carga.
        </p>
      </div>

      <BracketTree standalone />
    </div>
  );
}
