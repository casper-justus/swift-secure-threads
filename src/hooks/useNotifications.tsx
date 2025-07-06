
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseNotificationsProps {
  currentUserId: string;
  currentRoomId?: string;
}

export const useNotifications = ({ currentUserId, currentRoomId }: UseNotificationsProps) => {
  const { toast } = useToast();

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to new messages
    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Don't notify for own messages or messages in current room
          if (message.user_id === currentUserId || message.room_id === currentRoomId) {
            return;
          }

          // Get sender and room info
          const [senderData, roomData] = await Promise.all([
            supabase
              .from('messengers')
              .select('display_name, username')
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

          // Show toast notification
          toast({
            title: `New message from ${senderName}`,
            description: `In ${roomName}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
            duration: 5000,
          });

          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(`${senderName} in ${roomName}`, {
              body: message.content.substring(0, 100),
              icon: '/placeholder.svg',
              tag: `message-${message.id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currentRoomId, toast]);
};
