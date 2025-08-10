import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { useVideoPlayback } from "@/contexts/VideoPlaybackContext";
import { useContextualRelays } from "@/hooks/useContextualRelays";
import { useEffect } from "react";
import { logRoute } from "@/lib/devLogger";

import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Global from "./pages/Global";
import Discover from "./pages/Discover";
import Notifications from "./pages/Notifications";
import { Settings } from "./pages/Settings";
import { LightningWallet } from "./pages/LightningWallet";
import { Stream } from "./components/stream/Stream";
import { NostrEntity } from "./pages/NostrEntity";
import NotFound from "./pages/NotFound";

function RouteHandler() {
  const location = useLocation();
  const { resumeAllVideos } = useVideoPlayback();
  
  // Automatically optimize relay connections based on current route
  const { currentContext, isOptimized } = useContextualRelays();

  useEffect(() => {
    // Resume videos when navigating to video feed pages
    if (location.pathname === '/' || location.pathname === '/global') {
      resumeAllVideos();
    }
  }, [location.pathname, resumeAllVideos]);

  // Optional: Log relay optimization for debugging (only in development)
  useEffect(() => {
    if (isOptimized && import.meta.env.DEV) {
      logRoute('info', `Using ${currentContext} relay context for ${location.pathname}`);
    }
  }, [currentContext, isOptimized, location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:pubkey" element={<Profile />} />
      <Route path="/global" element={<Global />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/wallet" element={<LightningWallet />} />
      <Route path="/stream" element={<Stream />} />
      {/* Nostr entity handler - must be after specific routes */}
      <Route path="/:nip19Id" element={<NostrEntity />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollToTop />
      <RouteHandler />
    </BrowserRouter>
  );
}
export default AppRouter;