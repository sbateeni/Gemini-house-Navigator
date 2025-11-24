import { useEffect } from 'react';
import { supabase } from '../services/supabase';

export function usePresence(session: any, hasAccess: boolean) {
  useEffect(() => {
    if (!session?.user?.id || !hasAccess) return;

    // Create a presence channel
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Broadcast "I am online"
        await channel.track({
          user_id: session.user.id,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, hasAccess]);
}