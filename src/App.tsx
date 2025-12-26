import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import WeeklyReportPage from "./pages/WeeklyReportPage";
import IOReportPage from "./pages/IOReportPage";
import LabourAdvancePage from "./pages/LabourAdvancePage";
import NotFound from "./pages/NotFound";
import Login from "./components/Login";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Update last activity time
    const updateActivity = () => {
      if (localStorage.getItem("artextiles_auth") === "true") {
        localStorage.setItem("artextiles_last_activity", Date.now().toString());
      }
    };

    // Check localStorage for authentication
    const checkAuth = () => {
      const auth = localStorage.getItem("artextiles_auth");
      const lastActivity = localStorage.getItem("artextiles_last_activity");
      
      if (auth === "true" && lastActivity) {
        const currentTime = Date.now();
        const timePassed = currentTime - parseInt(lastActivity);
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // Check if 24 hours have passed since last activity
        if (timePassed > twentyFourHours) {
          // Auto logout due to inactivity
          localStorage.removeItem("artextiles_auth");
          localStorage.removeItem("artextiles_user");
          localStorage.removeItem("artextiles_last_activity");
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } else if (auth === "true") {
        // First time, set last activity
        updateActivity();
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
    
    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity);
    });
    
    // Check every minute if session expired
    const interval = setInterval(checkAuth, 60000);
    
    // Listen for storage changes (in case of logout from another tab)
    window.addEventListener("storage", checkAuth);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", checkAuth);
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weekly-report"
            element={
              <ProtectedRoute>
                <WeeklyReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/io-report"
            element={
              <ProtectedRoute>
                <IOReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/labour-advance"
            element={
              <ProtectedRoute>
                <LabourAdvancePage />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
