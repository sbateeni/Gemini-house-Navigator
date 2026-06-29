import React, { useState, useEffect, useRef } from 'react';
import { MapNote, MapUser, UnitStatus, ActiveCampaign, UserProfile } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { searchPlace } from '../services/geocoding';
import { GOVERNORATE_COORDS } from '../constants/governorates';

// Hooks
import { useAuth } from './useAuth';
import { useNotes } from '../features/notes/hooks/useNotes';
import { useGeolocation } from './useGeolocation';
import { usePresence } from '../features/presence/hooks/usePresence';
import { useNavigation } from './useNavigation';
import { useNoteForm } from './useNoteForm';
import { useAssignments } from '../features/dispatch/hooks/useAssignments';

export function useAppLogic(isSourceMode: boolean = false) {
  const { 
    session, authLoading, userRole, isApproved, permissions, 
    isAccountDeleted, handleLogout, refreshAuth, userProfile 
  } = useAuth();
  
  const isBanned = userRole === 'banned';
  const isAnyAdmin = ['central_operations', 'governorate_police', 'center', 'officer'].includes(userRole || '');
  const hasAccess = !isAccountDeleted && !isBanned && (isApproved || isAnyAdmin);

  const [myStatus, setMyStatus] = useState<UnitStatus>('patrol');
  const [isSOS, setIsSOS] = useState(false);

  // Destructure updateStatus from useNotes
  const { 
    notes, isConnected, tableMissing, addNote, updateNote, deleteNote, updateStatus, setNotes, setIsConnected 
  } = useNotes(session, hasAccess, isAccountDeleted, userProfile);
  
  const { userLocation, requestLocation, permissionDenied } = useGeolocation(hasAccess || isSourceMode);
  const { assignments, acceptAssignment } = useAssignments(session?.user?.id);
  const { onlineUsers } = usePresence(session, hasAccess, userLocation, myStatus, isSOS); 
  const { 
    currentRoute, secondaryRoute, isRouting, 
    handleNavigateToNote: rawHandleNavigateToNote, 
    handleNavigateToPoint, handleStopNavigation,
    calculateRoute, setSecondaryRoute
  } = useNavigation(userLocation);

  const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [mapProvider, setMapProvider] = useState(() => localStorage.getItem('ops_map_provider') || 'google');
  
  const isSatellite = mapProvider === 'google' || mapProvider === 'esri';
  const setIsSatellite = (val: boolean) => setMapProvider(val ? 'google' : 'carto');

  useEffect(() => {
    localStorage.setItem('ops_map_provider', mapProvider);
  }, [mapProvider]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{lat: number, lng: number, zoom?: number, timestamp: number, showPulse?: boolean} | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFullLogs, setShowFullLogs] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false); 
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

  const locateSOSUser = (lat: number, lng: number) => {
      if (lat === 0 && lng === 0) return;
      setFlyToTarget({ lat, lng, zoom: 17, timestamp: Date.now(), showPulse: true });
  };

  const locateLogUser = (userId: string, logLat?: number, logLng?: number) => {
      const user = onlineUsers.find(u => u.id === userId);
      if (user && user.lat && user.lng) {
          setFlyToTarget({ lat: user.lat, lng: user.lng, zoom: 17, timestamp: Date.now(), showPulse: true });
          return;
      }
      const lat = logLat ?? 0;
      const lng = logLng ?? 0;
      if (lat !== 0 || lng !== 0) {
          setFlyToTarget({ lat, lng, zoom: 17, timestamp: Date.now(), showPulse: true });
          return;
      }
      const profile = allProfiles.find(p => p.id === userId);
      const gov = profile?.governorate;
      if (gov && GOVERNORATE_COORDS[gov]) {
          setFlyToTarget({ lat: GOVERNORATE_COORDS[gov].lat, lng: GOVERNORATE_COORDS[gov].lng, zoom: 12, timestamp: Date.now(), showPulse: true });
      }
  };

  const handleToggleSOS = () => {
     if (session?.user) {
         const newIsSOS = !isSOS;
         setIsSOS(newIsSOS);
         db.createLogEntry({
             message: newIsSOS ? `🚨 استغاثة عاجلة 🚨` : `إلغاء الاستغاثة`,
             type: 'alert',
             userId: session.user.id,
             timestamp: Date.now(),
             governorate: userProfile?.governorate,
             center: userProfile?.center,
             lat: userLocation?.lat ?? null,
             lng: userLocation?.lng ?? null
         }).catch((e) => console.error("SOS log creation failed:", e));
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

  const [nearestRouteTarget, setNearestRouteTarget] = useState<{ nearestUserId: string; targetLat: number; targetLng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic rerouting for nearest-user-to-target
  useEffect(() => {
    if (!nearestRouteTarget) return;
    const uid = nearestRouteTarget.nearestUserId;
    const doRoute = async () => {
      const src = onlineUsers.find(u => u.id === uid);
      if (!src || (src.lat === 0 && src.lng === 0)) return;
      const route = await calculateRoute({ lat: src.lat, lng: src.lng }, { lat: nearestRouteTarget.targetLat, lng: nearestRouteTarget.targetLng });
      if (route) setSecondaryRoute(route);
    };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(doRoute, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [nearestRouteTarget, onlineUsers, calculateRoute, setSecondaryRoute]);

  const handleNavigateNearest = async (nearestLat: number, nearestLng: number, targetLat: number, targetLng: number) => {
    const nearestId = onlineUsers.find(u => u.lat === nearestLat && u.lng === nearestLng)?.id;
    if (!nearestId) {
      const route = await calculateRoute({ lat: nearestLat, lng: nearestLng }, { lat: targetLat, lng: targetLng });
      if (route) setSecondaryRoute(route);
    } else {
      setNearestRouteTarget({ nearestUserId: nearestId, targetLat, targetLng });
    }
    setFlyToTarget({ lat: (nearestLat + targetLat) / 2, lng: (nearestLng + targetLng) / 2, zoom: 13, timestamp: Date.now() });
    setCommandUser(null);
  };

  const clearNearestRoute = () => {
    setNearestRouteTarget(null);
    setSecondaryRoute(null);
  };

  return {
    session, authLoading, userRole, isApproved, isAccountDeleted, permissions, handleLogout, refreshAuth, userProfile, isBanned, hasAccess,
    notes, isConnected, tableMissing, updateStatus, setNotes,
    myStatus, setMyStatus, isSOS, handleToggleSOS, assignments, handleAcceptAssignment: acceptAssignment,
    onlineUsers, userLocation, distressedUser, handleLocateSOSUser: locateSOSUser, locateLogUser, allProfiles,
    currentRoute, secondaryRoute, isRouting, handleNavigateToNote, handleStopNavigation,
    sidebarOpen, setSidebarOpen, isSatellite, setIsSatellite, mapProvider, setMapProvider,
    searchQuery, setSearchQuery, isSearching, handleSearch, flyToTarget, locateUser, requestLocation, permissionDenied, isLocating,
    selectedNote, setSelectedNote, flyToNote, handleDeleteNote: deleteNote,
    showDashboard, setShowDashboard, showSettings, setShowSettings, showFullLogs, setShowFullLogs,
    showCampaigns, setShowCampaigns,
    handleNavigateNearest, clearNearestRoute,
    commandUser, setCommandUser, onUserClick: (u: MapUser) => setCommandUser(u), handleIntercept: () => {
        if (!commandUser) return;
        handleNavigateToPoint(commandUser.lat, commandUser.lng, locateUser);
        setCommandUser(null);
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
    setTargetUserFilter: (_filter: {id: string, name: string} | null) => {},
    activeCampaign, handleStartCampaign: (n: string, p: Set<string>, t: Set<string>, c: Set<string>) => {
        db.createCampaign({ name: n, participantIds: p, targetIds: t, commanderIds: c, startTime: Date.now() });
    }, handleEndCampaign: () => {
        if (activeCampaign?.id) db.endCampaign(activeCampaign.id);
    }, handleUpdateCampaign: (_name: string, _participants: Set<string>, t: Set<string>) => {
        if (activeCampaign?.id) db.updateCampaign(activeCampaign.id, { targetIds: t });
    }
  };
}