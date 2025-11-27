


import { MapNote, MapUser } from '../types';

export const createNoteIconHtml = (isSatellite: boolean) => `
  <div style="
    width: 32px; 
    height: 32px; 
    background-color: ${isSatellite ? '#ef4444' : '#3b82f6'}; 
    border: 3px solid white; 
    border-radius: 50%; 
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
  </div>
`;

// UPDATED: Using onclick with window.dispatchEvent to guarantee events fire regardless of Leaflet rendering cycle
export const createNotePopupHtml = (note: MapNote, canCommand: boolean) => `
  <div class="font-sans min-w-[180px] text-right" dir="rtl">
    <strong class="text-sm text-blue-400 block mb-1">${note.locationName}</strong>
    <p class="text-xs mb-3 line-clamp-2 text-slate-300">${note.userNote}</p>
    <div class="flex gap-2">
       <button 
         onclick="window.dispatchEvent(new CustomEvent('map-navigate', { detail: '${note.id}' }))"
         class="flex-1 bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-blue-500 transition-colors"
       >
          ذهاب
       </button>
       ${canCommand ? `
         <button 
           onclick="window.dispatchEvent(new CustomEvent('map-dispatch', { detail: '${note.id}' }))"
           class="flex-1 bg-purple-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-purple-500 transition-colors"
         >
            توجيه
         </button>
       ` : ''}
    </div>
  </div>
`;

export const createUserIconHtml = (user: MapUser) => `
  <div style="position: relative; width: 34px; height: 34px; transition: all 0.5s ease;">
      <div style="
          background-color: ${user.color || '#3b82f6'};
          width: 100%; height: 100%;
          border-radius: 50%;
          border: 2px solid white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      ">
          <span style="font-size: 12px; font-weight: bold; color: white;">${user.username.charAt(0).toUpperCase()}</span>
      </div>
      ${user.isSOS ? `<div style="position: absolute; inset: -10px; border-radius: 50%; border: 3px solid #ef4444; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
      <div style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(15, 23, 42, 0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; backdrop-filter: blur(4px);">${user.username}</div>
  </div>
`;

export const createSelfIconHtml = () => `
  <div style="position: relative; width: 24px; height: 24px;">
      <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">أنا</div>
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #3b82f6; border: 2px solid white; border-radius: 50%; z-index: 2;"></div>
      <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: pulse 2s infinite;"></div>
  </div>
`;

export const createTempMarkerIconHtml = () => `
  <div class="w-4 h-4 bg-white border-2 border-slate-900 rounded-full animate-bounce shadow-xl"></div>
`;
