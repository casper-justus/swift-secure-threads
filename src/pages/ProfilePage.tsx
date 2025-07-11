import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { UserProfile } from '@/components/profile/UserProfile'; // Assuming UserProfile is here
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
        navigate('/'); // Redirect to home if error fetching session
        return;
      }
      if (!currentSession) {
        navigate('/'); // Redirect to home if no session (user not logged in)
      } else {
        setSession(currentSession);
      }
      setLoading(false);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, sessionState) => {
      if (!sessionState) {
        navigate('/');
      }
      setSession(sessionState);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#36393f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865f2]"></div>
      </div>
    );
  }

  if (!session) {
    // This case should ideally be handled by the redirect in useEffect,
    // but as a fallback:
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#36393f] text-white">
            <p>You need to be logged in to view this page.</p>
            <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-[#5865f2] rounded hover:bg-[#4752c4]">
                Go to Login
            </button>
        </div>
    );
  }

  return <UserProfile session={session} />;
};

export default ProfilePage;
