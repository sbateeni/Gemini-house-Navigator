
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
  
  const { userLocation } = useGeolocation(hasAccess || isSourceMode);
  const { assignments, acceptAssignment } = useAssignments(session?.user?.id);
  
  // --- 4. Feature Hooks ---
  const { onlineUsers } = usePresence(session, hasAccess, userLocation, myStatus, isSOS); 
  const { 
    currentRoute, secondaryRoute, setSecondaryRoute, calculateRoute, isRouting, 
    handleNavigateToNote: rawHandleNavigateToNote, 
    handleNavigateToPoint, handleStopNavigation, clearSecondaryRoute
  } = useNavigation(userLocation);

  // --- 5. Local UI State ---
  const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
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
  const [isInCampaignMode, setIsInCampaignMode] = useState(false);

  const distressedUser = onlineUsers.find(u => u.isSOS && u.id !== session?.user?.id);

  const { 
      showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
      handleMapClick: rawHandleMapClick, handleEditNote, handleSaveNote, closeModal 
  } = useNoteForm(addNote, updateNote, setIsConnected, setSelectedNote, setSidebarOpen, userProfile);

  // Wrapped versions for UI components that expect a simpler signature
  const handleNavigateToNote = (note: MapNote) => rawHandleNavigateToNote(note, locateUser);
  const handleMapClick = (lat: number, lng: number) => rawHandleMapClick(lat, lng, handleStopNavigation);

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('gemini_map_provider', mapProvider);
  }, [mapProvider]);

  useEffect(() => {
      if (hasAccess && isAnyAdmin) {
          db.getAllProfiles().then(setAllProfiles).catch(() => {
            // التحقق من الصلاحيات دون تسريب تفاصيل الخطأ
          });
      }
  }, [hasAccess, isAnyAdmin, showCampaigns]);

  const fetchActiveCampaign = async () => {
      try {
        const campaign = await db.getActiveCampaign();
        setActiveCampaign(campaign);
        if (campaign && campaign.createdBy === session?.user?.id) {
            setIsInCampaignMode(true);
        } else if (!campaign) {
            setIsInCampaignMode(false);
        }
      } catch (e) {
        // فشل صامت لضمان عدم تسريب حالة الحملة للمخترقين
      }
  };

  useEffect(() => {
      if (!session) return;
      fetchActiveCampaign();
      const channel = supabase.channel('active_campaigns')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
              fetchActiveCampaign();
          })
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [session]);

  useEffect(() => {
    if (session?.user && hasAccess) {
       db.createLogEntry({
          message: `الوحدة غيرت الحالة إلى ${myStatus.toUpperCase()}`,
          type: 'status',
          userId: session.user.id,
          timestamp: Date.now(),
          governorate: userProfile?.governorate, 
          center: userProfile?.center
       }).catch(() => {});
    }
  }, [myStatus, session?.user?.id]);

  useEffect(() => {
    if (isSOS || distressedUser) playSiren();
    else stopSiren();
    return () => stopSiren();
  }, [isSOS, distressedUser, playSiren, stopSiren]);

  const locateUser = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
        setIsLocating(false);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setFlyToTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 17, timestamp: Date.now() });
            setIsLocating(false);
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleToggleSOS = () => {
     const newState = !isSOS;
     setIsSOS(newState);
     if (session?.user) {
         db.createLogEntry({
             message: newState ? `🚨 استغاثة عاجلة 🚨` : `إلغاء الاستغاثة`,
             type: 'alert',
             userId: session.user.id,
             timestamp: Date.now(),
             governorate: userProfile?.governorate,
             center: userProfile?.center
         }).catch(() => {});
     }
  };

  const handleLocateSOSUser = () => {
      if (distressedUser) {
          handleNavigateToPoint(distressedUser.lat, distressedUser.lng);
          setFlyToTarget({ lat: distressedUser.lat, lng: distressedUser.lng, zoom: 17, timestamp: Date.now(), showPulse: true });
      }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await searchPlace(searchQuery);
      if (result) {
        setFlyToTarget({ lat: result.lat, lng: result.lng, zoom: 14, timestamp: Date.now(), showPulse: true });
        setSearchQuery("");
        handleStopNavigation();
        if (window.innerWidth < 768) setSidebarOpen(false);
      }
    } catch (e) {
      // فشل البحث دون تسريب تفاصيل الاتصال
    } finally {
      setIsSearching(false);
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
      // لا نعرض تفاصيل الخطأ التقني هنا CWE-209
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
        // فشل الحذف الآمن
      }
    }
  };

  const onUserClick = (user: MapUser) => {
    if (isAnyAdmin || permissions.can_dispatch) setCommandUser(user);
  };

  const handleIntercept = () => {
    if (!commandUser) return;
    handleNavigateToPoint(commandUser.lat, commandUser.lng);
    setCommandUser(null);
  };

  const handleDispatch = () => {
    if (isAnyAdmin || permissions.can_dispatch) setShowLocationPicker(true);
  };

  const handleSelectDispatchLocation = async (note: MapNote) => {
    if (!commandUser) return;
    try {
      const route = await calculateRoute(
        { lat: commandUser.lat, lng: commandUser.lng },
        { lat: note.lat, lng: note.lng }
      );
      if (route) {
          setSecondaryRoute(route);
          setFlyToTarget({ lat: commandUser.lat, lng: commandUser.lng, zoom: 13, timestamp: Date.now() });
      }
    } catch(e) {}
    setShowLocationPicker(false);
    setCommandUser(null);
  };

  const handleOpenDispatchModal = (note: MapNote) => {
    if (isAnyAdmin || permissions.can_dispatch) setDispatchTargetLocation(note);
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
    } catch (e) {
      // إصلاح CWE-209: رسالة عامة بدلاً من تفاصيل الخطأ التقني
      alert("تعذر إرسال التكليف في الوقت الحالي.");
    }
  };

  const handleAcceptAssignment = (assignment: Assignment) => {
    acceptAssignment(assignment.id).catch(() => {});
    handleNavigateToPoint(assignment.lat, assignment.lng);
    setFlyToTarget({ lat: assignment.lat, lng: assignment.lng, zoom: 16, timestamp: Date.now() });
  };

  const handleStartCampaign = async (name: string, participants: Set<string>, targets: Set<string>, commanders: Set<string>) => {
      try {
          await db.createCampaign({ name, participantIds: participants, targetIds: targets, commanderIds: commanders, startTime: Date.now() });
          handleStopNavigation();
      } catch (e) {
          alert("فشل بدء العملية.");
      }
  };

  const handleUpdateCampaign = async (name: string, participants: Set<string>, targets: Set<string>, commanders: Set<string>) => {
      if (!activeCampaign || !activeCampaign.id) return;
      try {
          await db.updateCampaign(activeCampaign.id, { name, participantIds: participants, targetIds: targets, commanderIds: commanders });
      } catch (e) {}
  };

  const handleEndCampaign = async () => {
      if (!activeCampaign || !activeCampaign.id) return;
      if (!confirm("هل أنت متأكد من إنهاء العملية؟")) return;
      try {
          await db.endCampaign(activeCampaign.id);
          setIsInCampaignMode(false);
      } catch (e) {}
  };

  const handleJoinCampaign = () => {
      if (!activeCampaign || !session?.user) return;
      const uid = session.user.id;
      const isAuthorized = activeCampaign.createdBy === uid || activeCampaign.commanderIds.has(uid) || activeCampaign.participantIds.has(uid);
      if (isAuthorized) {
          setIsInCampaignMode(true);
          handleStopNavigation();
      }
  };

  const handleLeaveCampaignView = () => setIsInCampaignMode(false);

  const updateStatus = async (id: string, status: 'caught' | 'not_caught') => {
    const note = notes.find(n => n.id === id);
    if (note) {
      try {
        await updateNote({ ...note, status });
        if (status === 'caught' && activeCampaign && activeCampaign.id && activeCampaign.targetIds.has(id)) {
            const newTargets = new Set(activeCampaign.targetIds);
            newTargets.delete(id);
            await db.updateCampaign(activeCampaign.id, { targetIds: newTargets });
        }
      } catch(e) {}
    }
  };

  return {
    session, authLoading, userRole, isApproved, isAccountDeleted, permissions, handleLogout, refreshAuth, userProfile, isBanned, hasAccess,
    notes, isConnected, tableMissing, updateStatus, setNotes,
    myStatus, setMyStatus, isSOS, handleToggleSOS, assignments, handleAcceptAssignment,
    onlineUsers, userLocation, distressedUser, handleLocateSOSUser, allProfiles,
    currentRoute, secondaryRoute, isRouting, handleNavigateToNote, handleStopNavigation, clearSecondaryRoute,
    sidebarOpen, setSidebarOpen, isSatellite, setIsSatellite, mapProvider, setMapProvider,
    searchQuery, setSearchQuery, isSearching, handleSearch, flyToTarget, locateUser, isLocating,
    selectedNote, setSelectedNote, flyToNote, handleAnalyzeNote, handleDeleteNote, isAnalyzing,
    showDashboard, setShowDashboard, showSettings, setShowSettings, showFullLogs, setShowFullLogs,
    showCampaigns, setShowCampaigns,
    commandUser, setCommandUser, onUserClick, handleIntercept, handleDispatch,
    showLocationPicker, setShowLocationPicker, handleSelectDispatchLocation,
    dispatchTargetLocation, setDispatchTargetLocation, handleOpenDispatchModal, handleSendDispatchOrder,
    showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
    handleMapClick, handleEditNote, handleSaveNote, closeModal,
    targetUserFilter, setTargetUserFilter,
    activeCampaign, handleStartCampaign, handleEndCampaign, handleUpdateCampaign,
    isInCampaignMode, handleJoinCampaign, handleLeaveCampaignView
  };
}
