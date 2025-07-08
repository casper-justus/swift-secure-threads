
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

interface UseNotificationsOptions {
  currentUserId?: string;
  currentRoomId?: string;
  onNotificationTapped?: (notificationData: any) => void; // Callback for when notification is tapped
}

export const useNotifications = (options?: UseNotificationsOptions) => {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPushPermissionGranted, setIsPushPermissionGranted] = useState<boolean | null>(null);

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
    return () => {
      authListener.subscription.unsubscribe();
      // Clean up listeners when hook unmounts or user changes
      if (Capacitor.isPluginAvailable('PushNotifications')) {
        PushNotifications.removeAllListeners();
      }
    };
  }, []);

  const effectiveUserId = options?.currentUserId || currentUser?.id;

  // Capacitor Push Notification Logic
  useEffect(() => {
    if (!effectiveUserId || !Capacitor.isNativePlatform()) {
      if (Capacitor.isNativePlatform()) { // Only log if native but no user ID yet
        console.log('Push Notifications: Waiting for user ID.');
      } else {
        console.log('Push Notifications: Not a native platform. Skipping Capacitor setup.');
      }
      return;
    }

    const initPush = async () => {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        toast({ title: 'Push Notification Permission', description: 'Permission not granted.', variant: 'warning' });
        setIsPushPermissionGranted(false);
        return;
      }
      setIsPushPermissionGranted(true);

      // Now register for push notifications
      await PushNotifications.register();

      // On success, we should be able to receive notifications
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        await storeDeviceToken(token.value, effectiveUserId, Capacitor.getPlatform());
      });

      // Some issue with registration, token will not be received
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
        toast({ title: 'Push Registration Error', description: error.message || 'Could not register for push.', variant: 'destructive'});
      });

      // Show us the notification payload if the app is open on our device
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('Push received in foreground: ' + JSON.stringify(notification));
          // Display an in-app message or toast
          toast({
            title: notification.title || "New Message",
            description: notification.body || "You have a new message.",
            // You might want to add an action here to navigate if relevant
          });
        },
      );

      // Method called when tapping on a notification
      PushNotifications.addListener('pushNotificationActionPerformed', (notificationActionPerformed: ActionPerformed) => {
          console.log('Push action performed: ' + JSON.stringify(notificationActionPerformed));
          const data = notificationActionPerformed.notification.data;
          if (options?.onNotificationTapped) {
            options.onNotificationTapped(data);
          } else {
            // Default behavior: e.g., navigate to home or a specific chat based on 'data'
            // Example: if (data.roomId) { navigateTo(`/chat/${data.roomId}`); }
          }
        },
      );
    };

    initPush();

    // Clean up listeners
    return () => {
      if (Capacitor.isPluginAvailable('PushNotifications')) {
        PushNotifications.removeAllListeners(); // Or remove specific listeners if preferred
      }
    };

  }, [effectiveUserId, toast, options?.onNotificationTapped]);

  const storeDeviceToken = async (tokenValue: string, userId: string, platform: string) => {
    if (!userId) {
      console.error("Cannot store device token without user ID");
      return;
    }

    // Check if this token already exists for this user and platform
    const { data: existing, error: selectError } = await supabase
      .from('device_registrations')
      .select('id, token')
      .eq('user_id', userId)
      .eq('platform', platform)
      // .eq('token', tokenValue) // Check if token itself changed for this user/platform combo
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116: no rows found
        console.error("Error checking existing device registration:", selectError);
    }

    if (existing) {
      if (existing.token === tokenValue) {
        console.log("Device token already registered and up-to-date.");
        return; // Token is the same, no need to update
      }
      // Token changed for this user/platform, update it
      console.log("Updating existing device token for user:", userId, platform);
      const { error: updateError } = await supabase
        .from('device_registrations')
        .update({ token: tokenValue, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating device token:', updateError);
        toast({ title: "Device Token Update Error", description: updateError.message, variant: "destructive" });
      } else {
        console.log('Device token updated successfully.');
      }
      return;
    }

    // No existing registration for this user/platform, or token needs to be inserted
    console.log("Storing new device token for user:", userId, platform);
    const { error: insertError } = await supabase.from('device_registrations').insert({
      user_id: userId,
      token: tokenValue,
      platform: platform,
    });

    if (insertError) {
      console.error('Error saving device token:', insertError);
      toast({ title: "Device Token Save Error", description: insertError.message, variant: "destructive" });
    } else {
      console.log('Device token saved successfully.');
      toast({ title: "Notifications Active", description: "Device registered for notifications." });
    }
  };

  // --- In-App Notification Logic (via Supabase Realtime for messages) ---
  // This part can remain for immediate in-app feedback if desired,
  // even if native push handles background/foreground system notifications.
  useEffect(() => {
    if (!effectiveUserId) return;

    const currentRoomId = options?.currentRoomId;

    const messageChannel = supabase
      .channel(`in-app-message-notifications-for-${effectiveUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const message = payload.new as any;
          
          if (message.user_id === effectiveUserId) return; // Don't notify for own messages

          // If app is in foreground and user is in the same room, native push might be noisy.
          // The 'pushNotificationReceived' listener for Capacitor already handles foreground.
          // This toast is an alternative or supplement.
          // Consider if this is needed if native foreground notifications are also shown by the plugin.
          if (document.visibilityState === 'visible') {
            if (message.room_id === currentRoomId) {
              // console.log("In-app: Message in current room, app visible. Skipping toast if native foreground is active.");
              return; // Or show a more subtle in-app cue
            }

            // Fetch sender/room for toast if message is for another room
            const [senderData, roomData] = await Promise.all([
              supabase.from('messengers').select('display_name, username').eq('user_id', message.user_id).single(),
              supabase.from('chat_rooms').select('name').eq('id', message.room_id).single()
            ]);
            const senderName = senderData.data?.display_name || senderData.data?.username || 'Someone';
            const roomName = roomData.data?.name || 'Unknown Room';

            toast({
              title: `New message: ${senderName}`,
              description: `In ${roomName}: ${message.content.substring(0, 50)}...`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to in-app message notifications for user ${effectiveUserId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`In-app message notification channel error for ${effectiveUserId}:`, err);
        }
      });

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [effectiveUserId, options?.currentRoomId, toast]);

  return { isPushPermissionGranted }; // Expose relevant state
};
