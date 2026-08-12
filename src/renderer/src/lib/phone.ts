export const COUNTRY_CODES = [
  // Uruguay: celular sin el 0 inicial -> 8 dígitos (9X XXX XXX)
  { value: '598', label: 'Uruguay (+598)', digits: 8, example: '94123456' },
  // Brasil: DDD (2) + celular (9) -> 11 dígitos
  { value: '55', label: 'Brasil (+55)', digits: 11, example: '11912345678' }
] as const

export const DEFAULT_COUNTRY_CODE = COUNTRY_CODES[0].value

export function getCountry(countryCode: string) {
  return COUNTRY_CODES.find((c) => c.value === countryCode) ?? COUNTRY_CODES[0]
}

// Códigos ordenados de más largo a más corto para no confundir prefijos
// (ninguno de los tres es prefijo de otro, pero se deja robusto igual).
const CODES_BY_LENGTH = [...COUNTRY_CODES].sort((a, b) => b.value.length - a.value.length)

export function splitPhone(phone: string): { countryCode: string; localPhone: string } {
  const digits = phone.replace(/\D/g, '')
  const match = CODES_BY_LENGTH.find((c) => digits.startsWith(c.value))
  if (match) {
    return { countryCode: match.value, localPhone: digits.slice(match.value.length) }
  }
  return { countryCode: DEFAULT_COUNTRY_CODE, localPhone: digits }
}

export function joinPhone(countryCode: string, localPhone: string): string {
  return `${countryCode}${localPhone.replace(/\D/g, '')}`
}

export function formatPhone(phone: string): string {
  const { countryCode, localPhone } = splitPhone(phone)
  return `+${countryCode} ${localPhone}`
}
