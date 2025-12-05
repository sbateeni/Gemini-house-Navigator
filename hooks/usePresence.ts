
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
  const [presenceUsers, setPresenceUsers] = useState<MapUser[]>([]);
  const [dbUsers, setDbUsers] = useState<MapUser[]>([]);
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

  // Helper to safely get username string
  const getSafeUsername = (user: any): string => {
      let name = user?.user_metadata?.username;
      if (typeof name !== 'string') {
          name = user?.email?.split('@')[0] || 'Unknown';
      }
      return name;
  };

  // 1. Heartbeat: Update "Last Seen" AND "Location" in DB every 1 minute
  // This persistence allows users to appear "Active recently" even if WS disconnects
  useEffect(() => {
      if (!session?.user?.id || !hasAccess) return;
      
      const updateDB = () => {
         if (userLocation) {
             db.updateLastSeen(session.user.id, userLocation.lat, userLocation.lng);
         } else {
             db.updateLastSeen(session.user.id);
         }
      };

      // Initial update
      updateDB();

      const interval = setInterval(updateDB, 60 * 1000); 

      return () => clearInterval(interval);
  }, [session?.user?.id, hasAccess, userLocation?.lat, userLocation?.lng]);

  // 2. Poll Database for "Recently Active" users (Background/Disconnected but recent)
  // Fetches users seen in last 20 minutes
  useEffect(() => {
      if (!session?.user?.id || !hasAccess) return;

      const fetchRecentUsers = async () => {
          const recentData = await db.getRecentlyActiveUsers(20); // 20 minutes buffer
          const mappedUsers: MapUser[] = recentData.map((u: any) => ({
              id: u.id,
              username: typeof u.username === 'string' ? u.username : 'User',
              lat: u.lat,
              lng: u.lng,
              color: getUserColor(u.id),
              lastUpdated: u.last_seen,
              status: 'offline' as UnitStatus, // Default to offline for DB users, effectively "Last Seen"
              isSOS: false
          })).filter((u: MapUser) => u.id !== session.user.id); // Exclude self
          
          setDbUsers(mappedUsers);
      };

      fetchRecentUsers();
      const interval = setInterval(fetchRecentUsers, 30 * 1000); // Poll every 30s
      return () => clearInterval(interval);
  }, [session?.user?.id, hasAccess]);

  // 3. Setup Supabase Presence (Realtime Live Connection)
  useEffect(() => {
    if (!session?.user?.id || !hasAccess) return;

    const userId = session.user.id;
    const username = getSafeUsername(session.user);
    const userColor = getUserColor(userId);

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
                if (p.lat && p.lng) {
                    users.push({
                        id: p.user_id,
                        username: typeof p.username === 'string' ? p.username : 'Unknown',
                        lat: p.lat,
                        lng: p.lng,
                        color: p.color,
                        lastUpdated: p.online_at,
                        status: (p.status || 'patrol') as UnitStatus,
                        isSOS: p.isSOS || false
                    });
                }
            });
        });
        setPresenceUsers(users);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
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

  // 4. Update Presence Track when location changes OR Periodic Heartbeat
  useEffect(() => {
      const trackPresence = () => {
          if (channelRef.current && userLocation) {
              channelRef.current.track({
                  user_id: session?.user?.id,
                  username: getSafeUsername(session?.user),
                  color: getUserColor(session?.user?.id || ''),
                  online_at: Date.now(),
                  lat: userLocation.lat,
                  lng: userLocation.lng,
                  status: myStatus,
                  isSOS: isSOS
              });
          }
      };

      trackPresence(); // Immediate update on state change

      // Periodic heartbeat to keep presence alive even if location doesn't change
      const interval = setInterval(trackPresence, 20000); // 20s

      return () => clearInterval(interval);

  }, [userLocation, myStatus, isSOS]);

  // 5. Merge Strategy: Presence (Realtime) > Database (Recent History)
  useEffect(() => {
      // Start with all realtime users
      const mergedMap = new Map<string, MapUser>();
      
      // 1. Add DB users (Background/History)
      dbUsers.forEach(u => {
          mergedMap.set(u.id, u);
      });

      // 2. Add/Override with Presence users (Live) - they are fresher
      presenceUsers.forEach(u => {
          mergedMap.set(u.id, u);
      });

      setOnlineUsers(Array.from(mergedMap.values()));

  }, [presenceUsers, dbUsers]);

  return { onlineUsers };
}
