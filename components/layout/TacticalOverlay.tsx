
import React from 'react';
import { SOSButton } from '../SOSButton';
import { NotificationBell } from '../NotificationBell';
import { OperationsLog } from '../OperationsLog';
import { PlaneView } from '../PlaneView';
import { Assignment } from '../../types';

interface TacticalOverlayProps {
  isSOS: boolean;
  onToggleSOS: () => void;
  assignments: Assignment[];
  onAcceptAssignment: (assignment: Assignment) => void;
  onExpandLogs: () => void;
}

export const TacticalOverlay: React.FC<TacticalOverlayProps> = ({
  isSOS,
  onToggleSOS,
  assignments,
  onAcceptAssignment,
  onExpandLogs
}) => {
  return (
    <>
      {/* 3D Plane Visual */}
      <PlaneView />

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
