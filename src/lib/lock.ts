// =====================================================
// Lock helper: considera flag manual + fecha de bloqueo automático
// =====================================================

export type LockSettings = {
  is_locked?: boolean | null;
  lock_at?: string | null;
};

/**
 * Calcula si la quiniela está efectivamente bloqueada.
 * Devuelve true si:
 *   - El admin marcó manualmente is_locked = true, O
 *   - Ya pasó la fecha lock_at (auto-lock)
 */
export function isEffectivelyLocked(s: LockSettings | null | undefined): boolean {
  if (!s) return false;
  if (s.is_locked) return true;
  if (s.lock_at) {
    try {
      return new Date() >= new Date(s.lock_at);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Devuelve la razón del bloqueo: 'manual', 'auto', o null si no está bloqueada.
 */
export function lockReason(s: LockSettings | null | undefined): 'manual' | 'auto' | null {
  if (!s) return null;
  if (s.is_locked) return 'manual';
  if (s.lock_at && new Date() >= new Date(s.lock_at)) return 'auto';
  return null;
}

/**
 * Formatea la fecha de bloqueo en hora Medellín (UTC-5, sin DST).
 * Ej: "10 jun, 11:59 PM"
 */
export function formatLockAtMedellin(lockAt: string | null | undefined): string {
  if (!lockAt) return '';
  const d = new Date(lockAt);
  // Convertir a UTC-5
  const med = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const day = med.getUTCDate();
  const mon = months[med.getUTCMonth()];
  let h = med.getUTCHours();
  const m = med.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${day} ${mon}, ${h}:${mm} ${ampm}`;
}
