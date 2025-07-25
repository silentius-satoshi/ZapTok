import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { useVideoPlayback } from "@/contexts/VideoPlaybackContext";
import { useEffect } from "react";

import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Global from "./pages/Global";
import Discover from "./pages/Discover";
import { Settings } from "./pages/Settings";
import { Stream } from "./components/stream/Stream";
import { NostrEntity } from "./pages/NostrEntity";
import NotFound from "./pages/NotFound";

function RouteHandler() {
  const location = useLocation();
  const { resumeAllVideos } = useVideoPlayback();

  useEffect(() => {
    // Resume videos when navigating to video feed pages
    if (location.pathname === '/' || location.pathname === '/global') {
      resumeAllVideos();
    }
  }, [location.pathname, resumeAllVideos]);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:pubkey" element={<Profile />} />
      <Route path="/global" element={<Global />} />
      <Route path="/settings" element={<Settings />} />
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
    <BrowserRouter>
      <ScrollToTop />
      <RouteHandler />
    </BrowserRouter>
  );
}
export default AppRouter;