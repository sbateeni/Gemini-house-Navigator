
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { db } from '../services/db';
import { MapUser, UnitStatus } from '../types';

export function usePresence(
    session: any, 
    hasAccess: boolean, 
    userLocation: {lat: number, lng: number} | null,
    myStatus: UnitStatus = 'patrol',
    isSOS: boolean = false
) {
  const [onlineUsers, setOnlineUsers] = useState<MapUser[]>([]);
  const channelRef = useRef<any>(null);

  // Generate a consistent color for the user based on their ID
  const getUserColor = (id: string) => {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Heartbeat: Update "Last Seen" in DB every 5 minutes to keep session alive even if tab is backgrounded
  useEffect(() => {
      if (!session?.user?.id || !hasAccess) return;
      
      // Initial update
      db.updateLastSeen(session.user.id);

      const interval = setInterval(() => {
          db.updateLastSeen(session.user.id);
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
  }, [session?.user?.id, hasAccess]);

  useEffect(() => {
    if (!session?.user?.id || !hasAccess) return;

    const userId = session.user.id;
    const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Unknown';
    const userColor = getUserColor(userId);

    // Create a presence channel
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users: MapUser[] = [];

        Object.values(newState).forEach((presences: any) => {
            presences.forEach((p: any) => {
                // Don't include myself in the "other users" list logic for map filtering later if needed
                // But generally we want everyone in the list for the sidebar
                if (p.lat && p.lng) {
                    users.push({
                        id: p.user_id,
                        username: p.username,
                        lat: p.lat,
                        lng: p.lng,
                        color: p.color,
                        lastUpdated: p.online_at,
                        status: p.status || 'patrol',
                        isSOS: p.isSOS || false
                    });
                }
            });
        });
        setOnlineUsers(users);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Initial track (even if no location yet)
        await channel.track({
          user_id: userId,
          username: username,
          color: userColor,
          online_at: Date.now(),
          lat: userLocation?.lat,
          lng: userLocation?.lng,
          status: myStatus,
          isSOS: isSOS
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, hasAccess]);

  // Update location/status in realtime when user moves or changes state
  useEffect(() => {
      if (channelRef.current && userLocation) {
          // We intentionally don't await this to prevent blocking
          channelRef.current.track({
              user_id: session?.user?.id,
              username: session?.user?.user_metadata?.username || 'User',
              color: getUserColor(session?.user?.id || ''),
              online_at: Date.now(),
              lat: userLocation.lat,
              lng: userLocation.lng,
              status: myStatus,
              isSOS: isSOS
          });
      }
  }, [userLocation, myStatus, isSOS]);

  return { onlineUsers };
}
