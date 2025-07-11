import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const PRESENCE_CHANNEL_NAME = 'global-online-users';

export const useUserPresence = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.id;
    let presenceChannel = supabase.channel(PRESENCE_CHANNEL_NAME, {
      config: {
        presence: {
          key: userId, // Unique key for this user on the channel
        },
      },
    });

    const updateUserDatabaseStatus = async (status: 'online' | 'offline') => {
      try {
        const { error } = await supabase
          .from('messengers')
          .update({ status: status, last_seen: new Date().toISOString() })
          .eq('user_id', userId);
        if (error) {
          console.error(`Error updating user ${userId} status to ${status}:`, error);
        } else {
          console.log(`User ${userId} status updated to ${status}`);
        }
      } catch (err) {
        console.error('Exception updating user status:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserDatabaseStatus('online');
        presenceChannel.track({ online_at: new Date().toISOString(), user_id: userId });
      } else {
        // Consider user offline if tab is not visible.
        // Supabase presence will handle actual disconnects more reliably.
        updateUserDatabaseStatus('offline');
      }
    };

    const handleBeforeUnload = () => {
        // This is a best-effort attempt.
        // Supabase server-side presence handles actual disconnects.
        // For synchronous operations like Beacon API:
        // navigator.sendBeacon('/api/log-offline', JSON.stringify({ userId }));
        // For now, we rely on Supabase's own presence to clear up.
        // Or, if we had an edge function, Supabase presence could trigger it.
        updateUserDatabaseStatus('offline'); // Try to update DB directly
    };

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        // This event happens when the client first connects to the channel
        // and receives the current presence state.
        // We can see who else is online here if needed:
        // const presenceState = presenceChannel.presenceState();
        // console.log('Initial presence state:', presenceState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // console.log(key, 'joined', newPresences);
        // If the join event is for the current user, ensure their status is 'online'
        if (key === userId) {
            updateUserDatabaseStatus('online');
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // console.log(key, 'left', leftPresences);
        // If another user leaves, their status should be handled by their own client
        // or by a server-side function. Supabase presence itself tracks this.
        // If we want this client to update other users' status, that's different.
        // For now, this hook only manages the *current* user's status.
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Client is successfully subscribed to the channel
          await presenceChannel.track({ online_at: new Date().toISOString(), user_id: userId });
          updateUserDatabaseStatus('online'); // Also update DB
          console.log(`User ${userId} tracked presence as online.`);
        } else if (status === 'CLOSED') {
          // Channel closed, maybe connection lost or explicitly unsubscribed
           console.log(`Presence channel closed for user ${userId}. Attempting to mark offline.`);
           // This might not always run if browser closes abruptly
           await updateUserDatabaseStatus('offline');
        }
      });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initial status update
    updateUserDatabaseStatus('online');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (presenceChannel) {
        // Best effort to update status before unsubscribing / closing
        updateUserDatabaseStatus('offline').finally(() => {
            supabase.removeChannel(presenceChannel);
            console.log(`User ${userId} presence untracked and channel removed.`);
        });
      }
    };
  }, [currentUser]);

  return null; // This hook doesn't need to return anything for the component
};
