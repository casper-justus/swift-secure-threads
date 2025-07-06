
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "./Sidebar";
import { ChatTabs } from "./ChatTabs";
import { useToast } from "@/hooks/use-toast";

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_private: boolean;
}

interface ChatDashboardProps {
  session: Session;
}

export const ChatDashboard = ({ session }: ChatDashboardProps) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    initializeUser();
    fetchRooms();
  }, [session.user.id]);

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
            onConflict: 'id'
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

  const handleRoomCreated = (newRoom: ChatRoom) => {
    setRooms(prev => [newRoom, ...prev]);
    setActiveRoomId(newRoom.id);
  };

  const activeRoom = rooms.find(room => room.id === activeRoomId);

  return (
    <div className="h-screen flex bg-[#36393f] overflow-hidden">
      <Sidebar 
        rooms={rooms} 
        activeRoomId={activeRoomId}
        onRoomSelect={setActiveRoomId}
        onRoomCreated={handleRoomCreated}
        userId={session.user.id}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <ChatTabs 
            room={activeRoom} 
            userId={session.user.id}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#36393f]">
            <div className="text-center text-[#72767d]">
              <p className="text-lg mb-2">Welcome to Chat!</p>
              <p>Select a room to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
