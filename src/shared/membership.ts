export const MEMBERSHIP_PLANS = ['mensual', 'trimestral', 'semestral', 'anual'] as const
export type MembershipPlan = (typeof MEMBERSHIP_PLANS)[number]

export const PLAN_MONTHS: Record<MembershipPlan, number> = {
  mensual: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12
}

export const PLAN_LABEL: Record<MembershipPlan, string> = {
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual'
}

// La fecha (paid_at/due_at) viaja como 'YYYY-MM-DD' (sin hora) para no
// depender de zona horaria — se calcula y compara como texto/UTC nada más.
export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetMonthIndex = m - 1 + months
  // Si el pago fue el 31 y el mes de destino tiene menos días, cae en el
  // último día de ese mes en vez de "desbordar" al mes siguiente.
  const daysInTargetMonth = new Date(Date.UTC(y, targetMonthIndex + 1, 0)).getUTCDate()
  const day = Math.min(d, daysInTargetMonth)
  return new Date(Date.UTC(y, targetMonthIndex, day)).toISOString().slice(0, 10)
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}
