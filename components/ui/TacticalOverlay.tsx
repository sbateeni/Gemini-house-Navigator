
import React from 'react';
import { SOSButton } from '../../features/presence/components/SOSButton';
import { OperationsLog } from '../../features/notes/components/OperationsLog';
import { SOSAlertOverlay } from '../../features/presence/components/SOSAlertOverlay';
import { MapUser } from '../../types';

interface TacticalOverlayProps {
  isSOS: boolean;
  onToggleSOS: () => void;
  onExpandLogs: () => void;
  distressedUser?: MapUser;
  onLocateSOS?: (lat: number, lng: number) => void;
  canViewLogs?: boolean;
  onLocateLogUser?: (userId: string) => void;
}

export const TacticalOverlay: React.FC<TacticalOverlayProps> = ({
  isSOS,
  onToggleSOS,
  onExpandLogs,
  distressedUser,
  onLocateSOS,
  canViewLogs = true,
  onLocateLogUser
}) => {
  return (
    <>
        {/* SOS Alert HUD (Top Center) */}
        {distressedUser && onLocateSOS && (
            <SOSAlertOverlay sosUser={distressedUser} onLocate={onLocateSOS} />
        )}

        {/* HUD Elements */}
        <SOSButton 
            isActive={isSOS}
            onToggle={onToggleSOS}
        />
        
        {canViewLogs && <OperationsLog onExpand={onExpandLogs} onLocateUser={onLocateLogUser} />}
    </>
  );
};
