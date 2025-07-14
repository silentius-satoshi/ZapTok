import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Global from "./pages/Global";
import Discover from "./pages/Discover";
import { Settings } from "./pages/Settings";
import { Stream } from "./components/stream/Stream";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:pubkey" element={<Profile />} />
        <Route path="/global" element={<Global />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/stream" element={<Stream />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;