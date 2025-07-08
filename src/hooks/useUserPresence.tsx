import { useEffect, useState, useRef } from 'react'; // Added useRef
import { supabase } from '@/integrations/supabase/client';
import { User, RealtimeChannel } from '@supabase/supabase-js'; // Added RealtimeChannel

const PRESENCE_CHANNEL_NAME = 'global-online-users';
const LAST_SEEN_UPDATE_INTERVAL = 60 * 1000; // 1 minute

export const useUserPresence = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const lastSeenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
      if (lastSeenIntervalRef.current) {
        clearInterval(lastSeenIntervalRef.current);
      }
    };
  }, []);

  const updateUserDatabaseStatus = async (
    userId: string,
    statusUpdate: { status?: 'online' | 'offline'; last_seen?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('messengers')
        .update(statusUpdate)
        .eq('user_id', userId);
      if (error) {
        console.error(`Error updating user ${userId} status:`, error, statusUpdate);
      } else {
        console.log(`User ${userId} status updated:`, statusUpdate);
      }
    } catch (err) {
      console.error('Exception updating user status:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      // Clear interval and untrack if user logs out
      if (lastSeenIntervalRef.current) {
        clearInterval(lastSeenIntervalRef.current);
        lastSeenIntervalRef.current = null;
      }
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack().then(() => {
            supabase.removeChannel(presenceChannelRef.current!); // Non-null assertion ok due to check
            presenceChannelRef.current = null;
            console.log('User logged out, presence untracked and channel removed.');
        });
      }
      return;
    }

    const userId = currentUser.id;
    // Initialize or reuse channel
    if (!presenceChannelRef.current || presenceChannelRef.current.state === 'closed') {
        presenceChannelRef.current = supabase.channel(PRESENCE_CHANNEL_NAME, {
          config: {
            presence: {
              key: userId,
            },
          },
        });
    }

    const currentChannel = presenceChannelRef.current;


    const setupLastSeenInterval = () => {
      if (lastSeenIntervalRef.current) clearInterval(lastSeenIntervalRef.current);
      lastSeenIntervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          updateUserDatabaseStatus(userId, { last_seen: new Date().toISOString() });
        }
      }, LAST_SEEN_UPDATE_INTERVAL);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserDatabaseStatus(userId, { status: 'online', last_seen: new Date().toISOString() });
        currentChannel.track({ online_at: new Date().toISOString(), user_id: userId });
        setupLastSeenInterval(); // Restart interval when tab becomes visible
      } else {
        // When tab is hidden, clear the interval that updates last_seen for 'online' state.
        // The user is not actively 'seeing' things.
        // DB status remains 'online', last_seen will just become older.
        // Supabase server-side presence will handle actual disconnect.
        if (lastSeenIntervalRef.current) {
          clearInterval(lastSeenIntervalRef.current);
          lastSeenIntervalRef.current = null;
        }
        // Optionally, update last_seen one last time when tab becomes hidden
        updateUserDatabaseStatus(userId, { last_seen: new Date().toISOString() });
      }
    };

    const handleBeforeUnload = () => {
      // Best effort: update last_seen. Status 'offline' will be set by server-side presence timeout or explicit logout.
      updateUserDatabaseStatus(userId, { last_seen: new Date().toISOString() });
      // No need to call updateUserDatabaseStatus with 'offline' here as it's unreliable.
    };

    if (currentChannel.state !== 'joined') {
        currentChannel
        .on('presence', { event: 'sync' }, () => {
          // console.log('Presence sync event');
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          if (key === userId) { // Current user joined the channel
            updateUserDatabaseStatus(userId, { status: 'online', last_seen: new Date().toISOString() });
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
           // If a server-side function is not updating the DB on presence leave,
           // the DB might show user as 'online' until this client's next session or manual update.
           // For now, this hook primarily manages its own user's status.
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await currentChannel.track({ online_at: new Date().toISOString(), user_id: userId });
            updateUserDatabaseStatus(userId, { status: 'online', last_seen: new Date().toISOString() });
            console.log(`User ${userId} tracked presence as online.`);
            if (document.visibilityState === 'visible') {
              setupLastSeenInterval();
            }
          } else if (status === 'CLOSED') {
            console.log(`Presence channel closed for user ${userId}.`);
            if (lastSeenIntervalRef.current) {
              clearInterval(lastSeenIntervalRef.current);
            }
            // Attempt to mark offline in DB is unreliable here if browser is closing.
            // Rely on server-side function or next session's 'online' update.
          }
        });
    } else {
        // Channel already joined, ensure tracking and interval
        currentChannel.track({ online_at: new Date().toISOString(), user_id: userId });
        updateUserDatabaseStatus(userId, { status: 'online', last_seen: new Date().toISOString() });
        if (document.visibilityState === 'visible') {
            setupLastSeenInterval();
        }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initial status update for current session
    updateUserDatabaseStatus(userId, { status: 'online', last_seen: new Date().toISOString() });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (lastSeenIntervalRef.current) {
        clearInterval(lastSeenIntervalRef.current);
      }
      // Important: Do not remove the channel here if it's managed by presenceChannelRef
      // The logic for removing channel on user logout is at the start of this useEffect.
      // If component unmounts but user is still logged in (e.g. navigating away from app component),
      // we might want presence to persist. This depends on where useUserPresence is used.
      // For now, assuming it's app-global, channel cleanup on logout is key.
      // One final update of last_seen on component unmount (if user still logged in)
      if (currentUser) { // Check if user is still considered logged in by this hook's state
        updateUserDatabaseStatus(userId, { last_seen: new Date().toISOString() });
      }
    };
  }, [currentUser]); // Only re-run when currentUser changes

  return null;
};
