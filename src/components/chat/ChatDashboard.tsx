import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "./Sidebar";
import { ChatTabs } from "./ChatTabs";
import { ChatRoom } from "./ChatRoom";
import { RoomList } from "./RoomList";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { UserProfile } from "../profile/UserProfile";
import { useToast } from "@/hooks/use-toast";

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_private: boolean;
}

interface Messenger {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_key: string | null;
  status: string | null;
  last_seen: string | null;
}

interface ChatDashboardProps {
  session: Session;
}

export const ChatDashboard = ({ session }: ChatDashboardProps) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messenger, setMessenger] = useState<Messenger | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeUser();
    fetchRooms();
    fetchMessenger();
    setupPushNotifications();
    updateUserStatus('online');
    
    // Update status to offline when page is closed
    const handleBeforeUnload = () => {
      updateUserStatus('offline');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Set up periodic status updates
    const statusInterval = setInterval(() => {
      updateUserStatus('online');
    }, 30000); // Update every 30 seconds
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(statusInterval);
      updateUserStatus('offline');
    };
  }, [session.user.id]);

  const setupPushNotifications = async () => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Push notifications enabled');
          
          // Listen for new messages to show notifications
          const channel = supabase
            .channel('notifications')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
              },
              (payload) => {
                const message = payload.new;
                // Only show notification if message is not from current user
                if (message.user_id !== session.user.id) {
                  showNotification(message);
                }
              }
            )
            .subscribe();
            
          return () => {
            supabase.removeChannel(channel);
          };
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    }
  };

  const showNotification = async (message: any) => {
    try {
      // Get messenger info for the notification
      const { data: senderMessenger } = await supabase
        .from("messengers")
        .select("display_name, username")
        .eq("user_id", message.user_id)
        .single();

      const senderName = senderMessenger?.display_name || senderMessenger?.username || 'Someone';
      
      new Notification(`New message from ${senderName}`, {
        body: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
        icon: '/placeholder.svg',
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  const updateUserStatus = async (status: 'online' | 'offline') => {
    try {
      await supabase
        .from("messengers")
        .update({
          status: status,
          last_seen: new Date().toISOString()
        })
        .eq("user_id", session.user.id);
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const fetchMessenger = async () => {
    try {
      const { data, error } = await supabase
        .from("messengers")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching messenger:", error);
      } else if (data) {
        setMessenger(data);
      }
    } catch (error) {
      console.error("Fetch messenger error:", error);
    }
  };

  const initializeUser = async () => {
    try {
      // First, try to get existing messenger
      const { data: existingMessenger } = await supabase
        .from("messengers")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (!existingMessenger) {
        // Create messenger profile if it doesn't exist
        const { error: messengerError } = await supabase
          .from("messengers")
          .insert({
            user_id: session.user.id,
            username: session.user.user_metadata?.preferred_username || 
                     session.user.user_metadata?.user_name || 
                     session.user.email?.split('@')[0],
            display_name: session.user.user_metadata?.full_name || 
                         session.user.user_metadata?.name,
            avatar_url: session.user.user_metadata?.avatar_url,
            status: 'online'
          });

        if (messengerError) {
          console.error("Error creating messenger:", messengerError);
        }
      }

      // Also ensure profiles entry exists (but handle conflicts gracefully)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name,
            username: session.user.user_metadata?.preferred_username || 
                     session.user.user_metadata?.user_name || 
                     session.user.email?.split('@')[0],
            email: session.user.email,
            avatar_url: session.user.user_metadata?.avatar_url,
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (profileError) {
          console.warn("Profile creation/update warning:", profileError);
        }
      }
    } catch (error) {
      console.error("Error initializing user:", error);
    }
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch chat rooms",
          variant: "destructive",
        });
      } else {
        setRooms(data || []);
        if (data && data.length > 0 && !activeRoomId) {
          setActiveRoomId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Fetch rooms error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch chat rooms",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleRoomSelect = (room: ChatRoom) => {
    setActiveRoomId(room.id);
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from("chat_rooms")
        .delete()
        .eq("id", roomId)
        .eq("created_by", session.user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete room",
          variant: "destructive",
        });
      } else {
        setRooms(prev => prev.filter(room => room.id !== roomId));
        if (activeRoomId === roomId) {
          setActiveRoomId(null);
        }
        toast({
          title: "Room deleted",
          description: "The room has been deleted",
        });
      }
    } catch (error) {
      console.error("Delete room error:", error);
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    }
  };

  const handleRoomCreated = () => {
    // Refresh rooms list after creation
    fetchRooms();
    setShowCreateDialog(false);
  };

  const handleSignOut = async () => {
    await updateUserStatus('offline');
    await supabase.auth.signOut();
  };

  const handleCreateRoom = () => {
    setShowCreateDialog(true);
  };

  const activeRoom = rooms.find(room => room.id === activeRoomId);
  const selectedRoom = activeRoom || null;

  return (
    <div className="h-screen flex bg-[#36393f] overflow-hidden">
      <Sidebar 
        messenger={messenger}
        userEmail={session.user.email || ""}
        onSignOut={handleSignOut}
        onCreateRoom={handleCreateRoom}
      >
        <RoomList 
          rooms={rooms}
          selectedRoom={selectedRoom}
          onRoomSelect={handleRoomSelect}
          onDeleteRoom={handleDeleteRoom}
          currentUserId={session.user.id}
        />
      </Sidebar>
      
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <ChatTabs 
            profileTab={<UserProfile session={session} />}
          >
            <ChatRoom 
              room={activeRoom} 
              userId={session.user.id}
            />
          </ChatTabs>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#36393f]">
            <div className="text-center text-[#72767d]">
              <p className="text-lg mb-2">Welcome to Chat!</p>
              <p>Select a room to start chatting</p>
            </div>
          </div>
        )}
      </div>

      <CreateRoomDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onRoomCreated={handleRoomCreated}
        userId={session.user.id}
      />
    </div>
  );
};
