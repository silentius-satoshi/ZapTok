import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { useVideoPlayback } from "@/contexts/VideoPlaybackContext";
import { useContextualRelays } from "@/hooks/useContextualRelays";
import { useEffect } from "react";
import { logRoute } from "@/lib/devLogger";
import NostrProvider from "@/components/NostrProvider";
import { CachingProvider } from "@/components/CachingProvider";
import { WalletProvider } from "@/contexts/WalletContext";
import { VideoPlaybackProvider } from "@/contexts/VideoPlaybackContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletLoader } from "@/components/WalletLoader";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Global from "./pages/Global";
import Discover from "./pages/Discover";
import Notifications from "./pages/Notifications";
import { Settings } from "./pages/Settings";
import { LightningWallet } from "./pages/LightningWallet";
import { CashuWallet } from "./pages/CashuWallet";
import { BitcoinConnectWallet } from "./pages/BitcoinConnectWallet";
import { Stream } from "./components/stream/Stream";
import { NostrEntity } from "./pages/NostrEntity";
import About from "./pages/About";
import { ProModePage } from "./pages/ProModePage";
import DonationPage from "./pages/DonationPage";
import { ReadOnlyModeDemo } from "@/components/ReadOnlyModeDemo";
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
      <Route path="/" element={<Global />} />
      <Route path="/following" element={<Index />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:pubkey" element={<Profile />} />
      <Route path="/global" element={<Global />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/donate" element={<DonationPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/wallet" element={<LightningWallet />} />
      <Route path="/cashu-wallet" element={<CashuWallet />} />
      <Route path="/bitcoin-connect-wallet" element={<BitcoinConnectWallet />} />
      <Route path="/stream" element={<Stream />} />
      <Route path="/pro" element={<ProModePage />} />
      <Route path="/read-only-demo" element={<ReadOnlyModeDemo />} />
      {/* Nostr entity handler - must be after specific routes */}
      <Route path="/:nip19Id" element={<NostrEntity />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export function AppRouter() {
  return (
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollToTop />
      <NostrProvider>
        <CachingProvider>
          <WalletProvider>
            <VideoPlaybackProvider>
              <TooltipProvider>
                <WalletLoader />
                <Toaster />
                <Sonner />
                <RouteHandler />
              </TooltipProvider>
            </VideoPlaybackProvider>
          </WalletProvider>
        </CachingProvider>
      </NostrProvider>
    </HashRouter>
  );
}
export default AppRouter;