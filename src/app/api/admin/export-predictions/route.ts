import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import { ALL_MATCHES, TEAMS_ES } from '@/lib/tournament-data';
import { BRACKET, PHASE_LABELS } from '@/lib/bracket';
import { buildUserBracket } from '@/lib/bracket-builder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();

  // Auth: solo admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: meProfile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!meProfile?.is_admin) return new NextResponse('Forbidden', { status: 403 });

  // Fetch all data
  const [
    { data: profiles },
    { data: predictions },
    { data: bonus },
    { data: tiebreakers },
    { data: settings },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, full_name, email, paid'),
    supabase.from('match_predictions').select('user_id, match_id, home_score, away_score, winner_team').range(0, 9999),
    supabase.from('bonus_predictions').select('user_id, top_scorer, champion').range(0, 9999),
    supabase.from('user_group_tiebreaker').select('user_id, group_key, ranking').range(0, 9999),
    supabase.from('tournament_settings').select('entry_fee, currency, official_top_scorer, official_champion').eq('id', 1).single(),
  ]);

  // Organize predictions by user
  const predsByUser: Record<string, Record<string, { home_score: number; away_score: number; winner_team: string | null }>> = {};
  (predictions ?? []).forEach((p: { user_id: string; match_id: string; home_score: number; away_score: number; winner_team: string | null }) => {
    if (!predsByUser[p.user_id]) predsByUser[p.user_id] = {};
    predsByUser[p.user_id][p.match_id] = {
      home_score: p.home_score,
      away_score: p.away_score,
      winner_team: p.winner_team ?? null,
    };
  });

  const bonusByUser: Record<string, { top_scorer: string | null; champion: string | null }> = {};
  (bonus ?? []).forEach((b: { user_id: string; top_scorer: string | null; champion: string | null }) => {
    bonusByUser[b.user_id] = { top_scorer: b.top_scorer, champion: b.champion };
  });

  const tbByUser: Record<string, Record<string, string[]>> = {};
  (tiebreakers ?? []).forEach((t: { user_id: string; group_key: string; ranking: string[] }) => {
    if (!tbByUser[t.user_id]) tbByUser[t.user_id] = {};
    tbByUser[t.user_id][t.group_key] = t.ranking;
  });

  // Filter and sort players: ones with predictions first, then by name
  const players = ((profiles ?? []) as Array<{ id: string; display_name: string | null; full_name: string | null; email: string | null; paid: boolean | null }>)
    .map(p => ({
      id: p.id,
      name: p.display_name || 'Sin nombre',
      fullName: p.full_name || '',
      email: p.email || '',
      paid: p.paid === true,
      hasPredictions: !!predsByUser[p.id] && Object.keys(predsByUser[p.id]).length > 0,
    }))
    .sort((a, b) => {
      if (a.hasPredictions !== b.hasPredictions) return a.hasPredictions ? -1 : 1;
      return a.name.localeCompare(b.name, 'es');
    });

  // Build user brackets (with tiebreakers)
  const bracketsByUser: Record<string, ReturnType<typeof buildUserBracket>> = {};
  players.forEach(p => {
    const userPreds = predsByUser[p.id] ?? {};
    const groups: Record<string, { home_score: number; away_score: number }> = {};
    const knockout: Record<string, { home_score: number; away_score: number; winner_team: string | null }> = {};
    Object.entries(userPreds).forEach(([id, pred]) => {
      const isKnockout = id.startsWith('r32_') || id.startsWith('r16_') ||
        id.startsWith('qf_') || id.startsWith('sf_') ||
        id === 'tp' || id === 'final';
      if (isKnockout) {
        knockout[id] = pred;
      } else {
        groups[id] = { home_score: pred.home_score, away_score: pred.away_score };
      }
    });
    bracketsByUser[p.id] = buildUserBracket(groups, knockout, tbByUser[p.id]);
  });

  // ===========================================================================
  // BUILD EXCEL DATA
  // ===========================================================================
  const data: (string | number | null)[][] = [];

  // Header
  data.push(['PRONÓSTICOS MUNDIAL 2026']);
  data.push([`Exportado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`]);
  data.push([`Total jugadores: ${players.length}   |   Con pronósticos: ${players.filter(p => p.hasPredictions).length}   |   Pagaron: ${players.filter(p => p.paid).length}`]);
  data.push([]);

  // Player column headers (used in each section)
  const playerCols = players.map(p => `${p.name}${p.paid ? ' ✓' : ''}${!p.hasPredictions ? ' (sin pron.)' : ''}`);

  // ============ FASE DE GRUPOS ============
  data.push(['═══ FASE DE GRUPOS ═══']);
  data.push([]);
  data.push(['Grupo', 'Jornada', 'Partido', ...playerCols]);

  ALL_MATCHES.forEach(m => {
    const row: (string | number | null)[] = [
      m.group,
      m.matchday,
      `${TEAMS_ES[m.home]} vs ${TEAMS_ES[m.away]}`,
    ];
    players.forEach(p => {
      const pred = predsByUser[p.id]?.[m.id];
      row.push(pred ? `${pred.home_score}-${pred.away_score}` : '—');
    });
    data.push(row);
  });

  data.push([]);

  // ============ ELIMINATORIAS ============
  data.push(['═══ ELIMINATORIAS ═══']);
  data.push([]);
  data.push(['Slot', 'Fase', ...playerCols]);

  BRACKET.forEach(slot => {
    const row: (string | number | null)[] = [
      slot.id,
      PHASE_LABELS[slot.phase] || slot.phase,
    ];
    players.forEach(p => {
      const playerMatch = bracketsByUser[p.id]?.find(m => m.id === slot.id);
      if (!playerMatch?.home_team || !playerMatch?.away_team) {
        row.push('—');
      } else {
        const home = TEAMS_ES[playerMatch.home_team] || playerMatch.home_team;
        const away = TEAMS_ES[playerMatch.away_team] || playerMatch.away_team;
        const hScore = playerMatch.home_score ?? '?';
        const aScore = playerMatch.away_score ?? '?';
        const winnerName = playerMatch.winner ? (TEAMS_ES[playerMatch.winner] || playerMatch.winner) : '';
        const winnerNote = winnerName ? ` → ${winnerName}` : '';
        row.push(`${home} ${hScore}-${aScore} ${away}${winnerNote}`);
      }
    });
    data.push(row);
  });

  data.push([]);

  // ============ BONUS ============
  data.push(['═══ GOLEADOR & CAMPEÓN ═══']);
  data.push([]);
  data.push(['Bonus', ...playerCols]);

  // Goleador
  const goleadorRow: (string | number | null)[] = ['Goleador'];
  players.forEach(p => {
    goleadorRow.push(bonusByUser[p.id]?.top_scorer || '—');
  });
  data.push(goleadorRow);

  // Campeón (con auto-inferencia de la final)
  const campeonRow: (string | number | null)[] = ['Campeón'];
  players.forEach(p => {
    const b = bonusByUser[p.id];
    const finalPick = predsByUser[p.id]?.['final']?.winner_team;
    const effective = b?.champion || finalPick;
    if (effective) {
      const name = TEAMS_ES[effective] || effective;
      const note = !b?.champion && finalPick ? ' (de la final)' : '';
      campeonRow.push(`${name}${note}`);
    } else {
      campeonRow.push('—');
    }
  });
  data.push(campeonRow);

  data.push([]);

  // ============ ESTADO DE PAGO ============
  data.push(['═══ ESTADO DE PAGO ═══']);
  data.push([]);
  data.push(['Jugador', 'Email', 'Nombre completo', 'Pagó']);
  players.forEach(p => {
    data.push([p.name, p.email, p.fullName, p.paid ? 'Sí' : 'No']);
  });

  // ===========================================================================
  // CREATE WORKBOOK
  // ===========================================================================
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  const colWidths = [
    { wch: 10 }, // Grupo / Slot
    { wch: 10 }, // Jornada / Fase
    { wch: 32 }, // Partido
    ...players.map(() => ({ wch: 28 })), // Una columna por jugador
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Pronósticos');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

  const fileName = `pronosticos-mundial-2026-${new Date().toISOString().split('T')[0]}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
