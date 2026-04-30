import { WantedStatus } from '../types';

export const normalizeWantedStatus = (status?: string): WantedStatus => {
  if (status === 'caught') return 'closed';
  if (status === 'not_caught') return 'tracking';
  if (status === 'new' || status === 'tracking' || status === 'in_campaign' || status === 'closed') {
    return status;
  }
  return 'new';
};

export const toLegacyWantedStatus = (status?: WantedStatus | 'caught' | 'not_caught') => {
  const normalized = normalizeWantedStatus(status);
  return normalized === 'closed' ? 'caught' : 'not_caught';
};

export const wantedStatusLabel: Record<WantedStatus, string> = {
  new: 'جديد',
  tracking: 'قيد المتابعة',
  in_campaign: 'ضمن حملة',
  closed: 'مغلق',
};

export const wantedStatusBadgeClass: Record<WantedStatus, string> = {
  new: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  tracking: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  in_campaign: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  closed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};
