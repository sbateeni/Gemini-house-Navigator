import { MapNote } from '../types';

const GENERIC_TITLES = new Set([
  'موقع محدد',
  'موقع خاص (سري)',
  'موقع عام',
  'Marked Location',
  'Unknown Location',
]);

export const getNoteDisplayTitle = (note: MapNote): string => {
  const location = (note.locationName || '').trim();
  const noteText = (note.userNote || '').trim();

  const isGeneric =
    !location ||
    GENERIC_TITLES.has(location) ||
    location.startsWith('موقع محدد');

  if (isGeneric && noteText) {
    return noteText.length > 80 ? `${noteText.slice(0, 80)}...` : noteText;
  }

  return location || 'بلاغ بدون عنوان';
};
