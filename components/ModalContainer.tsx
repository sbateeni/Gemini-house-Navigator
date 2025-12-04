
import React from 'react';
import { CreateNoteModal } from './CreateNoteModal';
import { AdminDashboard } from './AdminDashboard';
import { SettingsModal } from './SettingsModal';
import { UserCommandModal } from './UserCommandModal';
import { LocationPickerModal } from './LocationPickerModal';
import { DispatchModal } from './DispatchModal';
import { FullLogsModal } from './FullLogsModal';
import { MapNote, UserProfile, UserRole, MapUser } from '../types';

interface ModalContainerProps {
  // Create Modal Props
  showCreateModal: boolean;
  closeCreateModal: () => void;
  tempCoords: { lat: number; lng: number } | null;
  userNoteInput: string;
  setUserNoteInput: (val: string) => void;
  onSaveNote: () => void;
  isAnalyzing: boolean;
  isEditingNote: boolean;

  // Dashboard Props
  showDashboard: boolean;
  closeDashboard: () => void;
  currentUserId: string;
  currentUserProfile: UserProfile | null;

  // Settings Props
  showSettings: boolean;
  closeSettings: () => void;
  user: any;
  userRole: UserRole | null;
  mapProvider: string;
  setMapProvider: (val: string) => void;

  // Tactical Command Props
  commandUser: MapUser | null;
  closeCommandUser: () => void;
  onIntercept: () => void;
  onDispatch: () => void;

  // Location Picker Props
  showLocationPickerModal: boolean;
  closeLocationPicker: () => void;
  notes: MapNote[];
  onSelectDispatchLocation: (note: MapNote) => void;
  commandUserName?: string;

  // Dispatch Props
  dispatchTargetLocation: MapNote | null;
  closeDispatchModal: () => void;
  onSendDispatch: (userId: string, instructions: string) => Promise<void>;

  // Logs Props
  showFullLogs: boolean;
  closeFullLogs: () => void;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  showCreateModal,
  closeCreateModal,
  tempCoords,
  userNoteInput,
  setUserNoteInput,
  onSaveNote,
  isAnalyzing,
  isEditingNote,
  showDashboard,
  closeDashboard,
  currentUserId,
  currentUserProfile,
  showSettings,
  closeSettings,
  user,
  userRole,
  mapProvider,
  setMapProvider,
  commandUser,
  closeCommandUser,
  onIntercept,
  onDispatch,
  showLocationPickerModal,
  closeLocationPicker,
  notes,
  onSelectDispatchLocation,
  commandUserName,
  dispatchTargetLocation,
  closeDispatchModal,
  onSendDispatch,
  showFullLogs,
  closeFullLogs
}) => {
  return (
    <>
      <CreateNoteModal 
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        tempCoords={tempCoords}
        userNoteInput={userNoteInput}
        setUserNoteInput={setUserNoteInput}
        onSave={onSaveNote}
        isAnalyzing={isAnalyzing}
        mode={isEditingNote ? 'edit' : 'create'}
      />

      <AdminDashboard 
        isOpen={showDashboard} 
        onClose={closeDashboard} 
        currentUserId={currentUserId}
        currentUserProfile={currentUserProfile}
      />

      <SettingsModal 
        isOpen={showSettings}
        onClose={closeSettings}
        user={user}
        userRole={userRole}
        mapProvider={mapProvider}
        setMapProvider={setMapProvider}
      />

      <UserCommandModal 
        isOpen={!!commandUser}
        onClose={closeCommandUser}
        user={commandUser}
        onIntercept={onIntercept}
        onDispatch={onDispatch}
      />

      <LocationPickerModal 
        isOpen={showLocationPickerModal}
        onClose={closeLocationPicker}
        notes={notes}
        onSelectLocation={onSelectDispatchLocation}
        targetUserName={commandUserName}
      />

      <DispatchModal 
        isOpen={!!dispatchTargetLocation}
        onClose={closeDispatchModal}
        targetLocation={dispatchTargetLocation}
        onDispatch={onSendDispatch}
        currentUserId={currentUserId}
      />

      <FullLogsModal 
        isOpen={showFullLogs}
        onClose={closeFullLogs}
        userRole={userRole}
      />
    </>
  );
};
