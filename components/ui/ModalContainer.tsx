
import React from 'react';
import { CreateNoteModal } from '../../features/notes/components/CreateNoteModal';
import { AdminDashboard } from '../../pages/dashboard/AdminDashboard';
import { SettingsModal } from './SettingsModal';
import { UserCommandModal } from './UserCommandModal';
import { LocationPickerModal } from '../../features/map/components/LocationPickerModal';
import { DispatchModal } from '../../features/dispatch/DispatchModal';
import { FullLogsModal } from './FullLogsModal';
import { CampaignsModal } from '../../features/campaigns/CampaignsModal';
import { MapNote, UserProfile, UserRole, MapUser, ActiveCampaign } from '../../types';

interface ModalContainerProps {
  // Create Modal Props
  showCreateModal: boolean;
  closeCreateModal: () => void;
  tempCoords: { lat: number; lng: number } | null;
  userNoteInput: string;
  setUserNoteInput: (val: string) => void;
  onSaveNote: (visibility: 'public' | 'private', title?: string) => void;
  isEditingNote: boolean;

  // Dashboard Props
  showDashboard: boolean;
  closeDashboard: () => void;
  currentUserId: string;
  currentUserEmail?: string;
  currentUserProfile: UserProfile | null;
  onlineUsers: MapUser[]; 
  allProfiles: UserProfile[]; // New

  // Settings Props
  showSettings: boolean;
  closeSettings: () => void;
  user: unknown;
  userRole: UserRole | null;
  mapProvider: string;
  setMapProvider: (val: string) => void;
  onOpenDatabaseFix?: () => void;

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
  onLocateLogUser?: (userId: string) => void;

  // Campaigns Props
  showCampaigns: boolean;
  closeCampaigns: () => void;
  activeCampaign: ActiveCampaign | null;
  onStartCampaign: (name: string, participants: Set<string>, targets: Set<string>, commanders: Set<string>) => void;
  onUpdateCampaign: (name: string, participants: Set<string>, targets: Set<string>, commanders: Set<string>) => void;

  // Permissions
  canEditUsers?: boolean;

  // Filter
  onFilterByUser: (userId: string, userName: string) => void;

  // Logout
  onLogout: () => void;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  showCreateModal,
  closeCreateModal,
  tempCoords,
  userNoteInput,
  setUserNoteInput,
  onSaveNote,
  isEditingNote,
  showDashboard,
  closeDashboard,
  currentUserId,
  currentUserEmail,
  currentUserProfile,
  onlineUsers,
  allProfiles,
  showSettings,
  closeSettings,
  user,
  userRole,
  mapProvider,
  setMapProvider,
  onOpenDatabaseFix,
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
  closeFullLogs,
  onLocateLogUser,
  showCampaigns,
  closeCampaigns,
  activeCampaign,
  onStartCampaign,
  onUpdateCampaign,
  onFilterByUser,
  onLogout,
  canEditUsers
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
        mode={isEditingNote ? 'edit' : 'create'}
      />

      <AdminDashboard 
        isOpen={showDashboard} 
        onClose={closeDashboard} 
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        currentUserProfile={currentUserProfile}
        onFilterByUser={onFilterByUser}
        canEditUsers={canEditUsers}
        onlineUsersList={onlineUsers}
      />

      <SettingsModal 
        isOpen={showSettings}
        onClose={closeSettings}
        user={user}
        userRole={userRole}
        mapProvider={mapProvider}
        setMapProvider={setMapProvider}
        onLogout={onLogout}
        onOpenDatabaseFix={onOpenDatabaseFix}
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

      <CampaignsModal 
        isOpen={showCampaigns}
        onClose={closeCampaigns}
        onlineUsers={onlineUsers}
        allProfiles={allProfiles}
        notes={notes}
        currentUserProfile={currentUserProfile}
        activeCampaign={activeCampaign}
        onStartCampaign={onStartCampaign}
        onUpdateCampaign={onUpdateCampaign}
      />
    </>
  );
};
