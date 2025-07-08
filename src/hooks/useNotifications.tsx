
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

// THIS SHOULD BE IN AN ENVIRONMENT VARIABLE
const VAPID_PUBLIC_KEY = 'BArqBoH3dfP0t_N2p30gEwYVqXkicM3dF3Xg2Y8qRjG8YJ4q7jT9zI_2pW8sC6N9sF0bV7k_D3qRzJ8sH8Xg'; // REPLACE WITH YOUR ACTUAL VAPID PUBLIC KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface UseNotificationsOptions {
  currentUserId?: string; // Made optional as it might be fetched from auth state
  currentRoomId?: string;
}

export const useNotifications = (options?: UseNotificationsOptions) => {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const effectiveUserId = options?.currentUserId || currentUser?.id;


  // Service Worker and Push Subscription Logic
  useEffect(() => {
    if (!effectiveUserId) return; // Wait for user ID

    const registerServiceWorkerAndSubscribe = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        setSubscriptionError(new Error('Push messaging not supported.'));
        return;
      }

      try {
        const swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', swRegistration);

        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
          console.log('Notification permission granted.');

          // Check if already subscribed
          let currentSubscription = await swRegistration.pushManager.getSubscription();
          if (currentSubscription) {
            console.log('User IS already subscribed.');
            // Optionally, verify this subscription on the server or update it
            // For simplicity, we'll assume it's valid if it exists
            await storeSubscription(currentSubscription, effectiveUserId);
            setIsSubscribed(true);
          } else {
            console.log('User is NOT subscribed. Subscribing...');
            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            currentSubscription = await swRegistration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey,
            });
            console.log('User is subscribed:', currentSubscription);
            await storeSubscription(currentSubscription, effectiveUserId);
            setIsSubscribed(true);
            toast({ title: "Notifications Enabled", description: "You'll now receive background notifications." });
          }
        } else {
          console.warn('Notification permission denied.');
          setSubscriptionError(new Error('Notification permission denied.'));
          toast({ title: "Notifications Disabled", description: "Permission denied.", variant: "warning" });
        }
      } catch (error) {
        console.error('Service Worker Error or Push Subscription Failed:', error);
        setSubscriptionError(error as Error);
        toast({ title: "Notification Error", description: (error as Error).message, variant: "destructive" });
      }
    };

    registerServiceWorkerAndSubscribe();

  }, [effectiveUserId, toast]); // Rerun if userId changes

  const storeSubscription = async (subscription: PushSubscription, userId: string) => {
    if (!userId) {
      console.error("Cannot store subscription without user ID");
      return;
    }
    const subscriptionDetails = subscription.toJSON();

    // Check if this exact endpoint already exists for this user to avoid duplicates
    // Supabase unique constraint on endpoint will also help server-side
    const { data: existing, error: selectError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('subscription_details->>endpoint', subscriptionDetails.endpoint)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116: no rows found
        console.error("Error checking existing subscription:", selectError);
        // Decide if to proceed or not
    }

    if (existing) {
      console.log("Subscription already exists for this user and endpoint.");
      // Optionally update timestamps if needed, but for now, do nothing.
      // const { error: updateError } = await supabase
      //   .from('push_subscriptions')
      //   .update({ subscription_details: subscriptionDetails, updated_at: new Date().toISOString() })
      //   .eq('id', existing.id);
      // if (updateError) console.error('Error updating push subscription:', updateError);
      return;
    }

    console.log("Storing new subscription for user:", userId, subscriptionDetails);
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      subscription_details: subscriptionDetails,
    });

    if (error) {
      console.error('Error saving push subscription:', error);
      setSubscriptionError(error);
      toast({ title: "Subscription Save Error", description: error.message, variant: "destructive" });
    } else {
      console.log('Push subscription saved successfully.');
    }
  };

  // --- Original In-App Notification Logic (can be kept or modified) ---
  useEffect(() => {
    if (!effectiveUserId) return;

    const currentRoomId = options?.currentRoomId;

    const messageChannel = supabase
      .channel(`message-notifications-for-${effectiveUserId}`) // More specific channel name
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // We cannot filter by message.user_id !== effectiveUserId directly in RLS for this,
          // so client-side filtering is necessary.
        },
        async (payload) => {
          const message = payload.new as any; // Define a proper type for message
          
          // Don't notify for own messages
          if (message.user_id === effectiveUserId) {
            return;
          }

          // If currentRoomId is provided and message is in current room,
          // decide if to show toast or rely on chat UI. For now, let's skip toast if in current room.
          if (message.room_id === currentRoomId && document.visibilityState === 'visible') {
             console.log("Message in current room, app visible. Skipping toast.");
            return;
          }

          // Get sender and room info
          const [senderData, roomData] = await Promise.all([
            supabase
              .from('messengers')
              .select('display_name, username, avatar_url')
              .eq('user_id', message.user_id)
              .single(),
            supabase
              .from('chat_rooms')
              .select('name')
              .eq('id', message.room_id)
              .single()
          ]);

          const senderName = senderData.data?.display_name || senderData.data?.username || 'Someone';
          const roomName = roomData.data?.name || 'Unknown Room';
          const senderAvatar = senderData.data?.avatar_url;

          // Show toast notification (for in-app feedback)
          toast({
            title: `New message from ${senderName} in ${roomName}`,
            description: `${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
            duration: 5000,
            // action: <ToastAction altText="Go to room">View</ToastAction>, // Example action
          });

          // The service worker will handle background notifications.
          // The old `new Notification(...)` here is redundant if SW is active and push is set up.
          // If you want foreground notifications NOT via push, this is where it would go.
          // However, for consistency, all notifications (foreground/background) should ideally be via SW.
          // If app is in foreground, SW can still show notification or postMessage to app to show custom UI.
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to message notifications for user ${effectiveUserId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Message notification channel error for ${effectiveUserId}:`, err);
        }
      });

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [effectiveUserId, options?.currentRoomId, toast]);

  return { isSubscribed, subscriptionError, requestPermission: () => {/* manual trigger if needed */} };
};
