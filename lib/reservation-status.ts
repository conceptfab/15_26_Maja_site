export type ReservationStatusKey = 'PENDING' | 'DEPOSIT_PAID' | 'PAID' | 'CANCELLED' | 'COMPLETED';

export type StatusInfo = {
  label: string;
  badgeClass: string;
  color: string;
  activeClass: string;
};

export const STATUS_CONFIG: Record<ReservationStatusKey, StatusInfo> = {
  PENDING: {
    label: 'Oczekująca',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    color: '#f59e0b',
    activeClass: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500',
  },
  DEPOSIT_PAID: {
    label: 'Zaliczka',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    color: '#3b82f6',
    activeClass: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500',
  },
  PAID: {
    label: 'Opłacona',
    badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
    color: '#22c55e',
    activeClass: 'bg-green-500 hover:bg-green-600 text-white border-green-500',
  },
  CANCELLED: {
    label: 'Anulowana',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    color: '#ef4444',
    activeClass: 'bg-red-500 hover:bg-red-600 text-white border-red-500',
  },
  COMPLETED: {
    label: 'Zakończona',
    badgeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    color: '#374151',
    activeClass: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600',
  },
};

export const STATUS_OPTIONS = (Object.entries(STATUS_CONFIG) as [ReservationStatusKey, StatusInfo][]).map(
  ([value, info]) => ({ value, label: info.label, color: info.color, activeClass: info.activeClass })
);

export function getStatusInfo(status: string): StatusInfo {
  return STATUS_CONFIG[status as ReservationStatusKey] ?? { label: status, badgeClass: '', color: '#888', activeClass: '' };
}

/** Statusy uznawane za "potwierdzone" (z przychodem) */
export const CONFIRMED_STATUSES: readonly ReservationStatusKey[] = ['DEPOSIT_PAID', 'PAID', 'COMPLETED'] as const;

/** Klasy Tailwind border do kalendarza */
export const STATUS_BORDER_COLORS: Record<ReservationStatusKey, string> = {
  PENDING: 'border-amber-400',
  DEPOSIT_PAID: 'border-blue-400',
  PAID: 'border-green-500',
  COMPLETED: 'border-gray-400',
  CANCELLED: 'border-red-400',
};

export const MONTH_NAMES = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'] as const;
