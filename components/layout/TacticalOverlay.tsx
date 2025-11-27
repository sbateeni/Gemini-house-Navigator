
import React from 'react';
import { SOSButton } from '../SOSButton';
import { OperationsLog } from '../OperationsLog';
import { PlaneView } from '../PlaneView';
import { SOSAlertOverlay } from '../SOSAlertOverlay';
import { Assignment, MapUser } from '../../types';

interface TacticalOverlayProps {
  isSOS: boolean;
  onToggleSOS: () => void;
  assignments: Assignment[]; // Kept for interface compatibility but not used for bell here
  onAcceptAssignment: (assignment: Assignment) => void;
  onExpandLogs: () => void;
  distressedUser?: MapUser;
  onLocateSOS?: () => void;
}

export const TacticalOverlay: React.FC<TacticalOverlayProps> = ({
  isSOS,
  onToggleSOS,
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

      {/* Floating Action Buttons */}
      <SOSButton 
        isActive={isSOS}
        onToggle={onToggleSOS}
      />
      
      {/* Bottom Ticker */}
      <OperationsLog onExpand={onExpandLogs} />
    </>
  );
};
