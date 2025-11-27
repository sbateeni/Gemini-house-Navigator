
import { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { Assignment } from '../types';

export function useAssignments(userId: string | undefined, onIncomingAssignment?: (a: Assignment) => void) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const onIncomingRef = useRef(onIncomingAssignment);

  useEffect(() => {
    onIncomingRef.current = onIncomingAssignment;
  }, [onIncomingAssignment]);

  useEffect(() => {
    if (!userId) return;

    const fetchAssignments = async () => {
      setLoadingAssignments(true);
      const data = await db.getMyAssignments(userId);
      setAssignments(data);
      setLoadingAssignments(false);
    };

    fetchAssignments();

    // Subscribe to realtime changes for MY assignments
    const channel = supabase
      .channel('my-assignments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Listen specifically for new assignments
          schema: 'public',
          table: 'assignments',
          filter: `target_user_id=eq.${userId}`
        },
        (payload: any) => {
          const newAssign: Assignment = {
              id: payload.new.id,
              targetUserId: payload.new.target_user_id,
              locationId: payload.new.location_id,
              locationName: payload.new.location_name,
              lat: payload.new.lat,
              lng: payload.new.lng,
              instructions: payload.new.instructions,
              status: payload.new.status,
              createdBy: payload.new.created_by,
              createdAt: payload.new.created_at
          };
          
          setAssignments(prev => [newAssign, ...prev]);
          
          // Trigger the callback for auto-dispatch logic
          if (onIncomingRef.current) {
              onIncomingRef.current(newAssign);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', 
          schema: 'public',
          table: 'assignments',
          filter: `target_user_id=eq.${userId}`
        },
        () => { fetchAssignments(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const acceptAssignment = async (id: string) => {
    await db.updateAssignmentStatus(id, 'accepted');
    // Local update for instant feedback
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'accepted' } : a));
  };

  const completeAssignment = async (id: string) => {
    await db.updateAssignmentStatus(id, 'completed');
    // Remove completed from list
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  return {
    assignments,
    loadingAssignments,
    acceptAssignment,
    completeAssignment
  };
}
