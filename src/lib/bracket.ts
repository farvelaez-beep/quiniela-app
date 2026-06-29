// =====================================================
// ESTRUCTURA OFICIAL FIFA - BRACKET MUNDIAL 2026
// =====================================================
//
// NOTA SOBRE FECHAS:
// match_date ahora guarda fecha + hora REAL en HORA COLOMBIA, como datetime
// local (formato 'YYYY-MM-DDTHH:MM:00', sin 'Z'). Esto arregla el bug por el
// que las fechas se mostraban un dia antes (antes se guardaban como 'YYYY-MM-DD'
// y JavaScript las interpretaba en UTC, corriendolas un dia en Colombia).
// Las horas de R32 y la final son las oficiales convertidas a Colombia.
// Octavos/Cuartos/Semis/3er puesto usan las fechas oficiales con hora 15:00
// como referencia (FIFA aun no publica la hora exacta de cada cruce).

export type SlotSpec =
  | { type: 'first'; group: string }   // 1A, 1B, etc.
  | { type: 'second'; group: string }  // 2A, 2B, etc.
  | { type: 'third_pick'; slot_id: string; allowed_groups: string[] }  // 3 ABCDF, etc.
  | { type: 'winner_of'; matchId: string }
  | { type: 'loser_of'; matchId: string };

export type BracketMatch = {
  id: string;
  phase: 'r32' | 'r16' | 'qf' | 'sf' | 'tp' | 'final';
  position: number;
  match_date: string;
  home: SlotSpec;
  away: SlotSpec;
};

export const PHASE_LABELS: Record<BracketMatch['phase'], string> = {
  r32: 'Ronda de 32',
  r16: 'Octavos de Final',
  qf: 'Cuartos de Final',
  sf: 'Semifinales',
  tp: '3er Puesto',
  final: 'Final',
};

export const PHASE_SHORT: Record<BracketMatch['phase'], string> = {
  r32: 'R32', r16: 'R16', qf: 'CF', sf: 'SF', tp: '3°', final: 'F',
};

// Estructura oficial del bracket FIFA 2026 (de la imagen del usuario)
export const BRACKET: BracketMatch[] = [
  // RONDA DE 32 - Lado izquierdo
  { id: 'r32_1', phase: 'r32', position: 1, match_date: '2026-06-29T15:30:00',
    home: { type: 'first', group: 'E' },
    away: { type: 'third_pick', slot_id: 'r32_1', allowed_groups: ['A','B','C','D','F'] } },
  { id: 'r32_2', phase: 'r32', position: 2, match_date: '2026-06-30T16:00:00',
    home: { type: 'first', group: 'I' },
    away: { type: 'third_pick', slot_id: 'r32_2', allowed_groups: ['C','D','F','G','H'] } },
  { id: 'r32_3', phase: 'r32', position: 3, match_date: '2026-06-28T14:00:00',
    home: { type: 'second', group: 'A' },
    away: { type: 'second', group: 'B' } },
  { id: 'r32_4', phase: 'r32', position: 4, match_date: '2026-06-29T22:00:00',
    home: { type: 'first', group: 'F' },
    away: { type: 'second', group: 'C' } },
  { id: 'r32_5', phase: 'r32', position: 5, match_date: '2026-07-02T18:00:00',
    home: { type: 'second', group: 'K' },
    away: { type: 'second', group: 'L' } },
  { id: 'r32_6', phase: 'r32', position: 6, match_date: '2026-07-02T17:00:00',
    home: { type: 'first', group: 'H' },
    away: { type: 'second', group: 'J' } },
  { id: 'r32_7', phase: 'r32', position: 7, match_date: '2026-07-01T22:00:00',
    home: { type: 'first', group: 'D' },
    away: { type: 'third_pick', slot_id: 'r32_7', allowed_groups: ['B','E','F','I','J'] } },
  { id: 'r32_8', phase: 'r32', position: 8, match_date: '2026-07-01T18:00:00',
    home: { type: 'first', group: 'G' },
    away: { type: 'third_pick', slot_id: 'r32_8', allowed_groups: ['A','E','H','I','J'] } },
  // RONDA DE 32 - Lado derecho
  { id: 'r32_9', phase: 'r32', position: 9, match_date: '2026-06-29T13:00:00',
    home: { type: 'first', group: 'C' },
    away: { type: 'second', group: 'F' } },
  { id: 'r32_10', phase: 'r32', position: 10, match_date: '2026-06-30T13:00:00',
    home: { type: 'second', group: 'E' },
    away: { type: 'second', group: 'I' } },
  { id: 'r32_11', phase: 'r32', position: 11, match_date: '2026-06-30T22:00:00',
    home: { type: 'first', group: 'A' },
    away: { type: 'third_pick', slot_id: 'r32_11', allowed_groups: ['C','E','F','H','I'] } },
  { id: 'r32_12', phase: 'r32', position: 12, match_date: '2026-07-01T11:00:00',
    home: { type: 'first', group: 'L' },
    away: { type: 'third_pick', slot_id: 'r32_12', allowed_groups: ['E','H','I','J','K'] } },
  { id: 'r32_13', phase: 'r32', position: 13, match_date: '2026-07-03T13:00:00',
    home: { type: 'first', group: 'J' },
    away: { type: 'second', group: 'H' } },
  { id: 'r32_14', phase: 'r32', position: 14, match_date: '2026-07-03T21:30:00',
    home: { type: 'second', group: 'D' },
    away: { type: 'second', group: 'G' } },
  { id: 'r32_15', phase: 'r32', position: 15, match_date: '2026-07-03T01:00:00',
    home: { type: 'first', group: 'B' },
    away: { type: 'third_pick', slot_id: 'r32_15', allowed_groups: ['E','F','G','I','J'] } },
  { id: 'r32_16', phase: 'r32', position: 16, match_date: '2026-07-03T18:00:00',
    home: { type: 'first', group: 'K' },
    away: { type: 'third_pick', slot_id: 'r32_16', allowed_groups: ['D','E','I','J','L'] } },

  // OCTAVOS R16 (4-7 jul oficial; hora referencial 15:00)
  { id: 'r16_1', phase: 'r16', position: 1, match_date: '2026-07-04T15:00:00',
    home: { type: 'winner_of', matchId: 'r32_1' },
    away: { type: 'winner_of', matchId: 'r32_2' } },
  { id: 'r16_2', phase: 'r16', position: 2, match_date: '2026-07-04T15:00:00',
    home: { type: 'winner_of', matchId: 'r32_3' },
    away: { type: 'winner_of', matchId: 'r32_4' } },
  { id: 'r16_3', phase: 'r16', position: 3, match_date: '2026-07-05T15:00:00',
    home: { type: 'winner_of', matchId: 'r32_5' },
    away: { type: 'winner_of', matchId: 'r32_6' } },
  { id: 'r16_4', phase: 'r16', position: 4, match_date: '2026-07-05T15:00:00',
    home: { type: 'winner_of', matchId: 'r32_7' },
    away: { type: 'winner_of', matchId: 'r32_8' } },
  { id: 'r16_5', phase: 'r16', position: 5, match_date: '2026-07-06T15:00:00',
    home: { type: 'winner_of', matchId: 'r32_9' },
    away: { type: 'winner_of', matchId: 'r32_10' } },
  { id: 'r16_6', phase: 'r16', position: 6, match_date: '2026-07-06T15:00:00',
    home: { type: 'winner_of', matchId: 'r32_11' },
    away: { type: 'winner_of', matchId: 'r32_12' } },
  { id: 'r16_7', phase: 'r16', position: 7, match_date: '2026-07-07T15:00:00',
    home: { type: 'winner_of', matchId: 'r32_13' },
    away: { type: 'winner_of', matchId: 'r32_14' } },
  { id: 'r16_8', phase: 'r16', position: 8, match_date: '2026-07-07T15:00:00',
    home: { type: 'winner_of', matchId: 'r32_15' },
    away: { type: 'winner_of', matchId: 'r32_16' } },

  // CUARTOS DE FINAL (9-11 jul oficial; hora referencial 15:00)
  { id: 'qf_1', phase: 'qf', position: 1, match_date: '2026-07-09T15:00:00',
    home: { type: 'winner_of', matchId: 'r16_1' },
    away: { type: 'winner_of', matchId: 'r16_2' } },
  { id: 'qf_2', phase: 'qf', position: 2, match_date: '2026-07-10T15:00:00',
    home: { type: 'winner_of', matchId: 'r16_3' },
    away: { type: 'winner_of', matchId: 'r16_4' } },
  { id: 'qf_3', phase: 'qf', position: 3, match_date: '2026-07-11T15:00:00',
    home: { type: 'winner_of', matchId: 'r16_5' },
    away: { type: 'winner_of', matchId: 'r16_6' } },
  { id: 'qf_4', phase: 'qf', position: 4, match_date: '2026-07-11T15:00:00',
    home: { type: 'winner_of', matchId: 'r16_7' },
    away: { type: 'winner_of', matchId: 'r16_8' } },

  // SEMIFINALES (14-15 jul oficial; hora referencial 15:00)
  { id: 'sf_1', phase: 'sf', position: 1, match_date: '2026-07-14T15:00:00',
    home: { type: 'winner_of', matchId: 'qf_1' },
    away: { type: 'winner_of', matchId: 'qf_2' } },
  { id: 'sf_2', phase: 'sf', position: 2, match_date: '2026-07-15T15:00:00',
    home: { type: 'winner_of', matchId: 'qf_3' },
    away: { type: 'winner_of', matchId: 'qf_4' } },

  // TERCER PUESTO (18 jul oficial)
  { id: 'tp', phase: 'tp', position: 1, match_date: '2026-07-18T15:00:00',
    home: { type: 'loser_of', matchId: 'sf_1' },
    away: { type: 'loser_of', matchId: 'sf_2' } },

  // FINAL (19 jul, 2:00 p.m. hora Colombia)
  { id: 'final', phase: 'final', position: 1, match_date: '2026-07-19T14:00:00',
    home: { type: 'winner_of', matchId: 'sf_1' },
    away: { type: 'winner_of', matchId: 'sf_2' } },
];

// Slots que requieren pick de tercero por el usuario
export const THIRD_PLACE_SLOTS: { slot_id: string; allowed_groups: string[] }[] = BRACKET
  .filter(m => m.home.type === 'third_pick' || m.away.type === 'third_pick')
  .map(m => {
    const slot = m.home.type === 'third_pick' ? m.home : m.away as Extract<SlotSpec, { type: 'third_pick' }>;
    return { slot_id: slot.slot_id, allowed_groups: slot.allowed_groups };
  });
