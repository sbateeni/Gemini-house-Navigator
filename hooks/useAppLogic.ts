
import React, { useState, useEffect, useRef } from 'react';
import { MapNote, MapUser, UnitStatus, Assignment, ActiveCampaign, UserProfile } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { searchPlace, identifyLocation } from '../services/gemini';

// Hooks
import { useAuth } from './useAuth';
import { useNotes } from './useNotes';
import { useGeolocation } from './useGeolocation';
import { usePresence } from './usePresence';
import { useNavigation } from './useNavigation';
import { useNoteForm } from './useNoteForm';
import { useAssignments } from './useAssignments';
import { useSound } from './useSound';

export function useAppLogic(isSourceMode: boolean = false) {
  // --- 1. Authentication & User Data ---
  const { 
    session, authLoading, userRole, isApproved, permissions, 
    isAccountDeleted, handleLogout, refreshAuth, userProfile 
  } = useAuth();
  
  const isBanned = userRole === 'banned';
  const isAnyAdmin = ['admin', 'super_admin', 'governorate_admin', 'center_admin', 'officer'].includes(userRole || '');
  const hasAccess = !isAccountDeleted && !isBanned && (isApproved || isAnyAdmin);

  // --- 2. Tactical State ---
  const [myStatus, setMyStatus] = useState<UnitStatus>('patrol');
  const [isSOS, setIsSOS] = useState(false);
  const { playSiren, stopSiren, playBeep } = useSound();

  // --- 3. Core Data Hooks ---
  const { 
    notes, isConnected, tableMissing, addNote, updateNote, deleteNote, setNotes, setIsConnected 
  } = useNotes(session, hasAccess, isAccountDeleted, userProfile);
  
  // Enable Geolocation if Access Granted OR Source Mode
  const { userLocation } = useGeolocation(hasAccess || isSourceMode);
  
  const { assignments, acceptAssignment } = useAssignments(session?.user?.id);
  
  // --- 4. Feature Hooks ---
  const { onlineUsers } = usePresence(session, hasAccess, userLocation, myStatus, isSOS); 
  const { 
    currentRoute, secondaryRoute, setSecondaryRoute, calculateRoute, isRouting, 
    handleNavigateToNote, handleNavigateToPoint, handleStopNavigation, clearSecondaryRoute
  } = useNavigation(userLocation);

  // --- 5. Local UI State ---
  const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  
  // Map Provider Logic
  const [mapProvider, setMapProvider] = useState(() => localStorage.getItem('gemini_map_provider') || 'google');
  
  const isSatellite = mapProvider === 'google' || mapProvider === 'esri';
  const setIsSatellite = (val: boolean) => {
      setMapProvider(val ? 'google' : 'carto');
  };
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{lat: number, lng: number, zoom?: number, timestamp: number, showPulse?: boolean} | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Modal States
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFullLogs, setShowFullLogs] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Tactical Command States
  const [commandUser, setCommandUser] = useState<MapUser | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [dispatchTargetLocation, setDispatchTargetLocation] = useState<MapNote | null>(null);

  // ADMIN FILTER STATE
  const [targetUserFilter, setTargetUserFilter] = useState<{id: string, name: string} | null>(null);

  // --- CAMPAIGN STATE (REALTIME) ---
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null);
  const [isInCampaignMode, setIsInCampaignMode] = useState(false); // Local flag: did the user click "Join"?

  // Find Distressed User
  const distressedUser = onlineUsers.find(u => u.isSOS && u.id !== session?.user?.id);

  // --- 6. Form Logic Hook ---
  const { 
      showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
      handleMapClick, handleEditNote, handleSaveNote, closeModal 
  } = useNoteForm(addNote, updateNote, setIsConnected, setSelectedNote, setSidebarOpen, userProfile);

  // --- 7. Effects & Handlers ---
  
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('gemini_map_provider', mapProvider);
  }, [mapProvider]);

  // Fetch All Profiles for Campaign Management (Offline users included)
  useEffect(() => {
      if (hasAccess && isAnyAdmin) {
          db.getAllProfiles().then(setAllProfiles);
      }
  }, [hasAccess, isAnyAdmin, showCampaigns]); // Refresh when opening modal

  // --- CAMPAIGN SYNC & REALTIME ---
  const fetchActiveCampaign = async () => {
      const campaign = await db.getActiveCampaign();
      setActiveCampaign(campaign);
      
      // Auto-join if I am the creator
      if (campaign && campaign.createdBy === session?.user?.id) {
          setIsInCampaignMode(true);
      } else if (!campaign) {
          setIsInCampaignMode(false);
      }
  };

  useEffect(() => {
      if (!session) return;
      fetchActiveCampaign();

      const channel = supabase.channel('active_campaigns')
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'campaigns' },
              () => {
                  console.log("Campaign update detected");
                  fetchActiveCampaign();
              }
          )
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [session]);


  // Log Status Changes
  useEffect(() => {
    if (session?.user && hasAccess) {
       db.createLogEntry({
          message: `الوحدة ${session.user.user_metadata?.username || 'User'} غيرت الحالة إلى ${myStatus.toUpperCase()}`,
          type: 'status',
          userId: session.user.id,
          timestamp: Date.now(),
          governorate: userProfile?.governorate, 
          center: userProfile?.center
       });
    }
  }, [myStatus, session?.user?.id]);

  // SOS Sound Logic
  useEffect(() => {
    if (isSOS || distressedUser) {
        playSiren();
    } else {
        stopSiren();
    }
    return () => stopSiren();
  }, [isSOS, distressedUser, playSiren, stopSiren]);

  const locateUser = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
        alert("المتصفح لا يدعم تحديد الموقع.");
        setIsLocating(false);
        return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
        const { latitude, longitude } = pos.coords;
        setFlyToTarget({ 
            lat: latitude, lng: longitude, zoom: 17, timestamp: Date.now() 
        });
        setIsLocating(false);
    };

    navigator.geolocation.getCurrentPosition(
        onSuccess,
        (err) => {
            console.warn("GPS failed", err);
            setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleToggleSOS = () => {
     const newState = !isSOS;
     setIsSOS(newState);
     if (session?.user) {
         db.createLogEntry({
             message: newState 
                ? `🚨 استغاثة عاجلة من ${session.user.user_metadata?.username?.toUpperCase()} 🚨` 
                : `${session.user.user_metadata?.username} ألغى الاستغاثة`,
             type: 'alert',
             userId: session.user.id,
             timestamp: Date.now(),
             governorate: userProfile?.governorate,
             center: userProfile?.center
         });
     }
  };

  const handleLocateSOSUser = () => {
      if (distressedUser) {
          handleNavigateToPoint(distressedUser.lat, distressedUser.lng);
          setFlyToTarget({ 
              lat: distressedUser.lat, 
              lng: distressedUser.lng, 
              zoom: 17, 
              timestamp: Date.now(),
              showPulse: true 
          });
      }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const result = await searchPlace(searchQuery);
    setIsSearching(false);
    if (result) {
      setFlyToTarget({ lat: result.lat, lng: result.lng, zoom: 14, timestamp: Date.now(), showPulse: true });
      setSearchQuery("");
      handleStopNavigation();
      if (window.innerWidth < 768) setSidebarOpen(false);
    }
  };

  const flyToNote = (note: MapNote) => {
    setSelectedNote(note);
    handleStopNavigation();
    setFlyToTarget({ lat: note.lat, lng: note.lng, zoom: 16, timestamp: Date.now() });
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleAnalyzeNote = async (note: MapNote) => {
    setIsAnalyzing(true);
    try {
      const result = await identifyLocation(note.lat, note.lng, note.userNote);
      const updatedNote: MapNote = {
        ...note,
        locationName: result.locationName,
        aiAnalysis: result.details,
        sources: result.sources
      };
      await updateNote(updatedNote);
      setSelectedNote(updatedNote);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("فشل التحليل الذكي.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("هل أنت متأكد من حذف هذا الموقع؟")) {
      try {
        await deleteNote(id);
        if (selectedNote?.id === id) setSelectedNote(null);
        if (currentRoute) handleStopNavigation();
      } catch (error) {
        alert("فشل الحذف. تأكد من الصلاحيات.");
      }
    }
  };

  const onUserClick = (user: MapUser) => {
    if (isAnyAdmin || permissions.can_dispatch) {
      setCommandUser(user);
    }
  };

  const handleIntercept = () => {
    if (!commandUser) return;
    handleNavigateToPoint(commandUser.lat, commandUser.lng);
    setCommandUser(null);
  };

  const handleDispatch = () => {
    if (isAnyAdmin || permissions.can_dispatch) {
      setShowLocationPicker(true);
    } else {
      alert("ليس لديك صلاحية التوجيه.");
    }
  };

  const handleSelectDispatchLocation = async (note: MapNote) => {
    if (!commandUser) return;
    const route = await calculateRoute(
      { lat: commandUser.lat, lng: commandUser.lng },
      { lat: note.lat, lng: note.lng }
    );
    if (route) {
        setSecondaryRoute(route);
        setFlyToTarget({ lat: commandUser.lat, lng: commandUser.lng, zoom: 13, timestamp: Date.now() });
    } else {
        alert("فشل حساب مسار التوجيه.");
    }
    setShowLocationPicker(false);
    setCommandUser(null);
  };

  const handleOpenDispatchModal = (note: MapNote) => {
    if (isAnyAdmin || permissions.can_dispatch) {
      setDispatchTargetLocation(note);
    } else {
      alert("ليس لديك صلاحية التوجيه.");
    }
  };

  const handleSendDispatchOrder = async (targetUserId: string, instructions: string) => {
    if (!dispatchTargetLocation || !session?.user) return;
    try {
      await db.createAssignment({
        targetUserId,
        locationId: dispatchTargetLocation.id,
        locationName: dispatchTargetLocation.locationName,
        lat: dispatchTargetLocation.lat,
        lng: dispatchTargetLocation.lng,
        instructions,
        createdBy: session.user.id
      });
      alert("تم الإرسال بنجاح!");
    } catch (e) {
      console.error("Dispatch failed", e);
      alert("فشل الإرسال.");
    }
  };

  const handleAcceptAssignment = (assignment: Assignment) => {
    acceptAssignment(assignment.id);
    handleNavigateToPoint(assignment.lat, assignment.lng);
    setFlyToTarget({ lat: assignment.lat, lng: assignment.lng, zoom: 16, timestamp: Date.now() });
  };

  // --- CAMPAIGN ACTIONS (DB) ---

  const handleStartCampaign = async (name: string, participants: Set<string>, targets: Set<string>, commanders: Set<string>) => {
      try {
          await db.createCampaign({
              name,
              participantIds: participants,
              targetIds: targets,
              commanderIds: commanders,
              startTime: Date.now()
          });
          handleStopNavigation();
      } catch (e) {
          console.error(e);
          alert("فشل بدء الحملة. تأكد من تحديث قاعدة البيانات.");
      }
  };

  const handleUpdateCampaign = async (name: string, participants: Set<string>, targets: Set<string>, commanders: Set<string>) => {
      if (!activeCampaign || !activeCampaign.id) return;
      try {
          await db.updateCampaign(activeCampaign.id, {
              name,
              participantIds: participants,
              targetIds: targets,
              commanderIds: commanders
          });
      } catch (e) {
          alert("فشل تحديث الحملة.");
      }
  };

  const handleEndCampaign = async () => {
      if (!activeCampaign || !activeCampaign.id) return;
      if (!confirm("هل أنت متأكد من إنهاء الحملة لجميع الوحدات؟")) return;
      try {
          await db.endCampaign(activeCampaign.id);
          setIsInCampaignMode(false);
      } catch (e) {
          alert("فشل إنهاء الحملة.");
      }
  };

  const handleJoinCampaign = () => {
      if (!activeCampaign || !session?.user) return;
      const uid = session.user.id;
      // Allow Creators, Commanders, and Participants
      const isAuthorized = 
          activeCampaign.createdBy === uid || 
          activeCampaign.commanderIds.has(uid) || 
          activeCampaign.participantIds.has(uid);

      if (isAuthorized) {
          setIsInCampaignMode(true);
          handleStopNavigation();
          alert("تم الانضمام إلى غرفة عمليات الحملة.");
      } else {
          alert("عذراً، أنت غير مدرج في قائمة هذه الحملة.");
      }
  };

  const handleLeaveCampaignView = () => {
      setIsInCampaignMode(false);
  };

  // Modified Update Status to handle Campaign Cleanup
  const updateStatus = async (id: string, status: 'caught' | 'not_caught') => {
    const note = notes.find(n => n.id === id);
    if (note) {
      await updateNote({ ...note, status });
      
      // AUTO-REMOVE FROM CAMPAIGN if Caught
      if (status === 'caught' && activeCampaign && activeCampaign.id && activeCampaign.targetIds.has(id)) {
          const newTargets = new Set(activeCampaign.targetIds);
          newTargets.delete(id);
          // Sync update to DB
          await db.updateCampaign(activeCampaign.id, { targetIds: newTargets });
      }
    }
  };

  return {
    // Auth
    session, authLoading, userRole, isApproved, isAccountDeleted, permissions, handleLogout, refreshAuth, userProfile, isBanned, hasAccess,
    // Core Data
    notes, isConnected, tableMissing, updateStatus, setNotes,
    // Tactical
    myStatus, setMyStatus, isSOS, handleToggleSOS, assignments, handleAcceptAssignment,
    onlineUsers, userLocation, distressedUser, handleLocateSOSUser, allProfiles,
    // Navigation
    currentRoute, secondaryRoute, isRouting, handleNavigateToNote, handleStopNavigation, clearSecondaryRoute,
    // UI State
    sidebarOpen, setSidebarOpen, isSatellite, setIsSatellite, mapProvider, setMapProvider,
    // Search & FlyTo
    searchQuery, setSearchQuery, isSearching, handleSearch, flyToTarget, locateUser, isLocating,
    // Note Actions
    selectedNote, setSelectedNote, flyToNote, handleAnalyzeNote, handleDeleteNote, isAnalyzing,
    // Modals
    showDashboard, setShowDashboard, showSettings, setShowSettings, showFullLogs, setShowFullLogs,
    showCampaigns, setShowCampaigns,
    // Tactical Command
    commandUser, setCommandUser, onUserClick, handleIntercept, handleDispatch,
    showLocationPicker, setShowLocationPicker, handleSelectDispatchLocation,
    dispatchTargetLocation, setDispatchTargetLocation, handleOpenDispatchModal, handleSendDispatchOrder,
    // Forms
    showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
    handleMapClick, handleEditNote, handleSaveNote, closeModal,
    // Admin Filters
    targetUserFilter, setTargetUserFilter,
    // Campaign
    activeCampaign, handleStartCampaign, handleEndCampaign, handleUpdateCampaign,
    isInCampaignMode, handleJoinCampaign, handleLeaveCampaignView
  };
}
