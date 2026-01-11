import React, { useState, useEffect } from 'react';
import { MapNote, MapUser, UnitStatus, ActiveCampaign, UserProfile } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { searchPlace } from '../services/gemini';

// Hooks
import { useAuth } from './useAuth';
import { useNotes } from './useNotes';
import { useGeolocation } from './useGeolocation';
import { usePresence } from './usePresence';
import { useNavigation } from './useNavigation';
import { useNoteForm } from './useNoteForm';
import { useAssignments } from './useAssignments';

export function useAppLogic(isSourceMode: boolean = false) {
  const { 
    session, authLoading, userRole, isApproved, permissions, 
    isAccountDeleted, handleLogout, refreshAuth, userProfile 
  } = useAuth();
  
  const isBanned = userRole === 'banned';
  const isAnyAdmin = ['admin', 'super_admin', 'governorate_admin', 'center_admin', 'officer'].includes(userRole || '');
  const hasAccess = !isAccountDeleted && !isBanned && (isApproved || isAnyAdmin);

  const [myStatus, setMyStatus] = useState<UnitStatus>('patrol');
  const [isSOS, setIsSOS] = useState(false);

  // Destructure updateStatus from useNotes
  const { 
    notes, isConnected, tableMissing, addNote, updateNote, deleteNote, updateStatus, setNotes, setIsConnected 
  } = useNotes(session, hasAccess, isAccountDeleted, userProfile);
  
  const { userLocation } = useGeolocation(hasAccess || isSourceMode);
  const { assignments, acceptAssignment } = useAssignments(session?.user?.id);
  const { onlineUsers } = usePresence(session, hasAccess, userLocation, myStatus, isSOS); 
  const { 
    currentRoute, secondaryRoute, setSecondaryRoute, calculateRoute, isRouting, 
    handleNavigateToNote: rawHandleNavigateToNote, 
    handleNavigateToPoint, handleStopNavigation
  } = useNavigation(userLocation);

  const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [mapProvider, setMapProvider] = useState(() => localStorage.getItem('gemini_map_provider') || 'google');
  
  const isSatellite = mapProvider === 'google' || mapProvider === 'esri';
  const setIsSatellite = (val: boolean) => setMapProvider(val ? 'google' : 'carto');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{lat: number, lng: number, zoom?: number, timestamp: number, showPulse?: boolean} | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFullLogs, setShowFullLogs] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [commandUser, setCommandUser] = useState<MapUser | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [dispatchTargetLocation, setDispatchTargetLocation] = useState<MapNote | null>(null);

  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null);

  const distressedUser = onlineUsers.find(u => u.isSOS && u.id !== session?.user?.id);

  const { 
      showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
      handleMapClick: rawHandleMapClick, handleEditNote, handleSaveNote, closeModal 
  } = useNoteForm(addNote, updateNote, setIsConnected, setSelectedNote, setSidebarOpen, userProfile);

  const handleNavigateToNote = (note: MapNote) => rawHandleNavigateToNote(note, locateUser);
  const handleMapClick = (lat: number, lng: number) => rawHandleMapClick(lat, lng, handleStopNavigation);

  useEffect(() => {
    if (hasAccess && isAnyAdmin && !isSourceMode) {
        db.getAllProfiles().then(setAllProfiles).catch(() => {});
    }
  }, [hasAccess, isAnyAdmin, isSourceMode]);

  useEffect(() => {
      if (!session) return;
      const fetchCampaign = async () => {
          const campaign = await db.getActiveCampaign();
          setActiveCampaign(campaign);
      };
      fetchCampaign();
      const channel = supabase.channel('campaigns').on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, fetchCampaign).subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [session]);

  const locateUser = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setFlyToTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 17, timestamp: Date.now() });
            setIsLocating(false);
        },
        () => setIsLocating(false)
    );
  };

  const handleToggleSOS = () => {
     setIsSOS(!isSOS);
     if (session?.user) {
         db.createLogEntry({
             message: !isSOS ? `🚨 استغاثة عاجلة 🚨` : `إلغاء الاستغاثة`,
             type: 'alert',
             userId: session.user.id,
             timestamp: Date.now(),
             governorate: userProfile?.governorate,
             center: userProfile?.center
         });
     }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const result = await searchPlace(searchQuery);
    if (result) {
        setFlyToTarget({ lat: result.lat, lng: result.lng, zoom: 14, timestamp: Date.now(), showPulse: true });
        setSearchQuery("");
        handleStopNavigation();
    }
    setIsSearching(false);
  };

  const flyToNote = (note: MapNote) => {
    setSelectedNote(note);
    setFlyToTarget({ lat: note.lat, lng: note.lng, zoom: 16, timestamp: Date.now() });
  };

  // Proper implementation for dispatching assignments as async function
  const handleSendDispatchOrder = async (userId: string, instructions: string) => {
    if (!dispatchTargetLocation) return;
    try {
        await db.createAssignment({
            targetUserId: userId,
            locationId: dispatchTargetLocation.id,
            locationName: dispatchTargetLocation.locationName,
            lat: dispatchTargetLocation.lat,
            lng: dispatchTargetLocation.lng,
            instructions,
            createdBy: session?.user?.id
        });
        await db.createLogEntry({
            message: `تم تكليف وحدة بمهمة: ${dispatchTargetLocation.locationName}`,
            type: 'dispatch',
            userId: session?.user?.id,
            timestamp: Date.now(),
            governorate: userProfile?.governorate,
            center: userProfile?.center
        });
    } catch (e) {
        console.error("Dispatch failed", e);
    }
  };

  return {
    session, authLoading, userRole, isApproved, isAccountDeleted, permissions, handleLogout, refreshAuth, userProfile, isBanned, hasAccess,
    notes, isConnected, tableMissing, updateStatus, setNotes,
    myStatus, setMyStatus, isSOS, handleToggleSOS, assignments, handleAcceptAssignment: acceptAssignment,
    onlineUsers, userLocation, distressedUser, handleLocateSOSUser: locateUser, allProfiles,
    currentRoute, secondaryRoute, isRouting, handleNavigateToNote, handleStopNavigation,
    sidebarOpen, setSidebarOpen, isSatellite, setIsSatellite, mapProvider, setMapProvider,
    searchQuery, setSearchQuery, isSearching, handleSearch, flyToTarget, locateUser, isLocating,
    selectedNote, setSelectedNote, flyToNote, handleAnalyzeNote: (n: any) => {}, handleDeleteNote: deleteNote, isAnalyzing,
    showDashboard, setShowDashboard, showSettings, setShowSettings, showFullLogs, setShowFullLogs,
    showCampaigns, setShowCampaigns,
    commandUser, setCommandUser, onUserClick: (u: MapUser) => setCommandUser(u), handleIntercept: () => {
        if (commandUser) {
            handleNavigateToPoint(commandUser.lat, commandUser.lng);
            setCommandUser(null);
        }
    }, handleDispatch: () => {
        setShowLocationPicker(true);
    },
    showLocationPicker, setShowLocationPicker, handleSelectDispatchLocation: (n: MapNote) => {
        setDispatchTargetLocation(n);
        setShowLocationPicker(false);
    },
    dispatchTargetLocation, setDispatchTargetLocation, handleOpenDispatchModal: (n: MapNote) => setDispatchTargetLocation(n), handleSendDispatchOrder,
    showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
    handleMapClick, handleEditNote, handleSaveNote, closeModal,
    setTargetUserFilter: (f: any) => {},
    activeCampaign, handleStartCampaign: (n: string, p: Set<string>, t: Set<string>, c: Set<string>) => {
        db.createCampaign({ name: n, participantIds: p, targetIds: t, commanderIds: c, startTime: Date.now() });
    }, handleEndCampaign: () => {
        if (activeCampaign?.id) db.endCampaign(activeCampaign.id);
    }, handleUpdateCampaign: (n: string, p: Set<string>, t: Set<string>, c: Set<string>) => {
        if (activeCampaign?.id) db.updateCampaign(activeCampaign.id, { targetIds: t });
    }
  };
}