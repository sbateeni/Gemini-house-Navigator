
import React from 'react';
import { SOSButton } from '../SOSButton';
import { OperationsLog } from '../OperationsLog';
import { SOSAlertOverlay } from '../SOSAlertOverlay';
import { MapUser } from '../../types';

interface TacticalOverlayProps {
  isSOS: boolean;
  onToggleSOS: () => void;
  onExpandLogs: () => void;
  distressedUser?: MapUser;
  onLocateSOS?: () => void;
  minimal?: boolean;
}

export const TacticalOverlay: React.FC<TacticalOverlayProps> = ({
  isSOS,
  onToggleSOS,
  onExpandLogs,
  distressedUser,
  onLocateSOS,
  minimal = false
}) => {
  return (
    <>
      {/* HUD Elements */}
      {!minimal && (
        <>
            {/* SOS Alert HUD (Top Center) */}
            {distressedUser && onLocateSOS && (
                <SOSAlertOverlay sosUser={distressedUser} onLocate={onLocateSOS} />
            )}

            <SOSButton 
                isActive={isSOS}
                onToggle={onToggleSOS}
            />
            
            <OperationsLog onExpand={onExpandLogs} />
        </>
      )}
    </>
  );
};
