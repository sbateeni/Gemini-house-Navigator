


import React from 'react';
import { SOSButton } from '../SOSButton';
import { NotificationBell } from '../NotificationBell';
import { OperationsLog } from '../OperationsLog';
import { PlaneView } from '../PlaneView';
import { SOSAlertOverlay } from '../SOSAlertOverlay';
import { Assignment, MapUser } from '../../types';

interface TacticalOverlayProps {
  isSOS: boolean;
  onToggleSOS: () => void;
  assignments: Assignment[];
  onAcceptAssignment: (assignment: Assignment) => void;
  onExpandLogs: () => void;
  distressedUser?: MapUser; // The user sending SOS (if any)
  onLocateSOS?: () => void;
}

export const TacticalOverlay: React.FC<TacticalOverlayProps> = ({
  isSOS,
  onToggleSOS,
  assignments,
  onAcceptAssignment,
  onExpandLogs,
  distressedUser,
  onLocateSOS
}) => {
  return (
    <>
      {/* 3D Plane Visual */}
      <PlaneView />

      {/* SOS Alert HUD (Top Center) */}
      {distressedUser && onLocateSOS && (
        <SOSAlertOverlay sosUser={distressedUser} onLocate={onLocateSOS} />
      )}

      {/* HUD Elements */}
      <NotificationBell 
        assignments={assignments}
        onAccept={onAcceptAssignment}
      />
      
      <SOSButton 
        isActive={isSOS}
        onToggle={onToggleSOS}
      />
      
      <OperationsLog onExpand={onExpandLogs} />
    </>
  );
};
