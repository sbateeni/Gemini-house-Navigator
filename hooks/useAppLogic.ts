
import React, { useState, useEffect } from 'react';
import { MapNote, MapUser, UnitStatus, Assignment } from '../types';
import { db } from '../services/db';
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

export function useAppLogic() {
  // --- 1. Authentication & User Data ---
  const { 
    session, authLoading, userRole, isApproved, permissions, 
    isAccountDeleted, handleLogout, refreshAuth, userProfile 
  } = useAuth();
  
  const isBanned = userRole === 'banned';
  const isAnyAdmin = ['admin', 'super_admin', 'governorate_admin', 'center_admin'].includes(userRole || '');
  const hasAccess = !isAccountDeleted && !isBanned && (isApproved || isAnyAdmin);

  // --- 2. Tactical State ---
  const [myStatus, setMyStatus] = useState<UnitStatus>('patrol');
  const [isSOS, setIsSOS] = useState(false);
  const { playSiren, stopSiren } = useSound();

  // --- 3. Core Data Hooks ---
  const { 
    notes, isConnected, tableMissing, addNote, updateNote, deleteNote, updateStatus, setIsConnected 
  } = useNotes(session, hasAccess, isAccountDeleted, userProfile);
  
  const { userLocation } = useGeolocation(session, hasAccess);
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
  const [isSatellite, setIsSatellite] = useState(() => localStorage.getItem('gemini_map_mode') === 'satellite');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{lat: number, lng: number, zoom?: number, timestamp: number, showPulse?: boolean} | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Modal States
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFullLogs, setShowFullLogs] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Tactical Command States
  const [commandUser, setCommandUser] = useState<MapUser | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [dispatchTargetLocation, setDispatchTargetLocation] = useState<MapNote | null>(null);

  // Find Distressed User (Someone else who triggered SOS)
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
    localStorage.setItem('gemini_map_mode', isSatellite ? 'satellite' : 'street');
  }, [isSatellite]);

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

  // SOS Sound Logic (Trigger if I am SOS OR someone else is SOS)
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

    // Define success handler
    const onSuccess = (pos: GeolocationPosition) => {
        const { latitude, longitude } = pos.coords;
        setFlyToTarget({ 
            lat: latitude, lng: longitude, zoom: 17, timestamp: Date.now() 
        });
        setIsLocating(false);
    };

    // Define error handler for Low Accuracy fallback
    const onLowAccError = (err: GeolocationPositionError) => {
        console.error("GPS Fallback failed:", err);
        alert("تعذر تحديد الموقع. الرجاء التحقق من إعدادات GPS.");
        setIsLocating(false);
    };

    // 1. Try High Accuracy first
    navigator.geolocation.getCurrentPosition(
        onSuccess,
        (err) => {
            console.warn("High accuracy GPS failed, trying low accuracy...", err);
            // 2. Fallback to Low Accuracy (Wifi/Cell) - Fixes Safari/Indoor timeout issues
            navigator.geolocation.getCurrentPosition(
                onSuccess,
                onLowAccError,
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
            );
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
    if (isAnyAdmin) {
      setCommandUser(user);
    }
  };

  const handleIntercept = () => {
    if (!commandUser) return;
    handleNavigateToPoint(commandUser.lat, commandUser.lng);
    setCommandUser(null);
  };

  const handleDispatch = () => {
    setShowLocationPicker(true);
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
    setDispatchTargetLocation(note);
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
      await db.createLogEntry({
          message: `تم إرسال تكليف للوحدة`,
          type: 'dispatch',
          userId: session.user.id,
          timestamp: Date.now(),
          governorate: userProfile?.governorate,
          center: userProfile?.center
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

  // Auto-Dispatch Logic for Users
  const handleIncomingAssignment = (assignment: Assignment) => {
      // If I am a normal user (not admin), auto-accept and navigate
      if (userRole === 'user') {
          playSiren(); // Brief alert sound
          setTimeout(() => stopSiren(), 2000);
          
          acceptAssignment(assignment.id);
          handleNavigateToPoint(assignment.lat, assignment.lng);
          setFlyToTarget({ lat: assignment.lat, lng: assignment.lng, zoom: 16, timestamp: Date.now() });
          
          alert("⚠️ أمر عمليات عاجل: تم بدء التوجيه للموقع المستهدف.");
      } else {
          // Admins/Commanders get notified via the bell/log, no auto-nav
          playSiren();
          setTimeout(() => stopSiren(), 1000);
      }
  };

  return {
    // Auth
    session, authLoading, userRole, isApproved, isAccountDeleted, permissions, handleLogout, refreshAuth, userProfile, isBanned, hasAccess,
    // Core Data
    notes, isConnected, tableMissing, updateStatus,
    // Tactical
    myStatus, setMyStatus, isSOS, handleToggleSOS, assignments, handleAcceptAssignment,
    onlineUsers, userLocation, distressedUser, handleLocateSOSUser,
    // Navigation
    currentRoute, secondaryRoute, isRouting, handleNavigateToNote, handleStopNavigation, clearSecondaryRoute,
    // UI State
    sidebarOpen, setSidebarOpen, isSatellite, setIsSatellite,
    // Search & FlyTo
    searchQuery, setSearchQuery, isSearching, handleSearch, flyToTarget, locateUser, isLocating,
    // Note Actions
    selectedNote, setSelectedNote, flyToNote, handleAnalyzeNote, handleDeleteNote, isAnalyzing,
    // Modals
    showDashboard, setShowDashboard, showSettings, setShowSettings, showFullLogs, setShowFullLogs,
    // Tactical Command
    commandUser, setCommandUser, onUserClick, handleIntercept, handleDispatch,
    showLocationPicker, setShowLocationPicker, handleSelectDispatchLocation,
    dispatchTargetLocation, setDispatchTargetLocation, handleOpenDispatchModal, handleSendDispatchOrder,
    // Forms
    showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
    handleMapClick, handleEditNote, handleSaveNote, closeModal
  };
}
