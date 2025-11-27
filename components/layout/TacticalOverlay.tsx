
import React from 'react';
import { SOSButton } from '../SOSButton';
import { OperationsLog } from '../OperationsLog';
import { PlaneView } from '../PlaneView';
import { SOSAlertOverlay } from '../SOSAlertOverlay';
import { MapUser } from '../../types';

interface TacticalOverlayProps {
  isSOS: boolean;
  onToggleSOS: () => void;
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

      {/* HUD Elements */}
      <SOSButton 
        isActive={isSOS}
        onToggle={onToggleSOS}
      />
      
      <OperationsLog onExpand={onExpandLogs} />
    </>
  );
};
