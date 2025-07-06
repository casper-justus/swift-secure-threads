
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { AuthForm } from "@/components/auth/AuthForm";
import { ChatDashboard } from "@/components/chat/ChatDashboard";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    // Authentication logic
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => { // Renamed to avoid conflict
      setSession(initialSession);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => { // Renamed to avoid conflict
      setSession(currentSession);
    });

    // Viewport resize listener for keyboard handling
    const handleViewportResize = () => {
      if (window.visualViewport) {
        // Set height considering the visual viewport's offsetTop, which accounts for browser UI like address bar
        // This ensures the effective height is what's truly visible for web content.
        setViewportHeight(window.visualViewport.height - window.visualViewport.offsetTop);
      } else {
        // Fallback for browsers that don't support visualViewport well, though less reliable for keyboard
        setViewportHeight(window.innerHeight);
      }
    };

    if (window.visualViewport) {
      // Initial set
      handleViewportResize(); // Call once to set initial height correctly
      window.visualViewport.addEventListener('resize', handleViewportResize);
    } else {
      window.addEventListener('resize', handleViewportResize);
    }

    return () => {
      subscription.unsubscribe();
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      } else {
        window.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#36393f]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865f2]"></div>
      </div>
    );
  }

  return (
    // Apply dynamic height to this container
    // flex flex-col is important so ChatDashboard can use flex-grow
    <div
      className="bg-[#36393f] flex flex-col"
      style={{ height: `${viewportHeight}px`, overflow: 'hidden' }} // overflow:hidden to prevent body scroll
    >
      {!session ? (
        // Ensure AuthForm is also reasonably displayed if viewport shrinks
        <div className="flex-grow flex items-center justify-center p-4 overflow-y-auto">
          <AuthForm />
        </div>
      ) : (
        // ChatDashboard needs to be structured to fill this height (e.g. h-full flex flex-col)
        <ChatDashboard session={session} />
      )}
    </div>
  );
};

export default Index;
