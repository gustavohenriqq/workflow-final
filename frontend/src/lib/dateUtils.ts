import { formatDistanceToNow, format as dateFnsFormat, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

export function shortDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return dateFnsFormat(d, 'dd/MM/yy', { locale: ptBR })
}

export function fullDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return dateFnsFormat(d, 'dd/MM/yy HH:mm', { locale: ptBR })
}

export function fullDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return dateFnsFormat(d, 'dd/MM/yy HH:mm:ss', { locale: ptBR })
}

export function isoDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return dateFnsFormat(d, 'dd/MM', { locale: ptBR })
}

export function computeSlaStatus(
  deadline: string | Date | null,
): 'ok' | 'warning' | 'critical' | 'expired' {
  if (!deadline) return 'ok'
  const d = typeof deadline === 'string' ? parseISO(deadline) : deadline
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return 'expired'
  if (diff <= 2 * 3600 * 1000) return 'critical'
  if (diff <= 24 * 3600 * 1000) return 'warning'
  return 'ok'
}
