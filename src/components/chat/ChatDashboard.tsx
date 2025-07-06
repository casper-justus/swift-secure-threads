
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { RoomList } from "./RoomList";
import { ChatRoom } from "./ChatRoom";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { UserProfile } from "../profile/UserProfile";
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

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ChatDashboardProps {
  session: Session;
}

export const ChatDashboard = ({ session }: ChatDashboardProps) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data, error, status } = await supabase
        .from("profiles")
        .select("id, name, username, avatar_url")
        .eq("id", session.user.id)
        .single();

      if (error && status !== 406) {
        console.error("Error fetching profile:", error.message);
      } else if (data) {
        setUserProfile(data as UserProfile);
      }
    } catch (error: any) {
      console.error("Unexpected error fetching profile:", error.message);
    }
  };

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch rooms",
        variant: "destructive",
      });
    } else {
      setRooms(data || []);
    }
  };

  const deleteRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from("chat_rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      setRooms(rooms.filter(room => room.id !== roomId));
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
      }
      
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="h-screen flex bg-[#36393f]">
      <Sidebar
        userProfile={userProfile}
        userEmail={session.user?.email || ""}
        onSignOut={handleSignOut}
        onCreateRoom={() => setShowCreateRoom(true)}
      >
        <RoomList
          rooms={rooms}
          selectedRoom={selectedRoom}
          onRoomSelect={setSelectedRoom}
          onDeleteRoom={deleteRoom}
          currentUserId={session.user.id}
        />
      </Sidebar>

      <div className="flex-1">
        <ChatTabs
          profileTab={<UserProfile session={session} />}
        >
          {selectedRoom ? (
            <ChatRoom room={selectedRoom} userId={session.user.id} />
          ) : (
            <div className="h-full flex items-center justify-center bg-[#36393f]">
              <div className="text-center text-[#b9bbbe]">
                <h2 className="text-2xl font-semibold mb-2 text-white">Select a room to start chatting</h2>
                <p>Choose a room from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </ChatTabs>
      </div>

      <CreateRoomDialog
        open={showCreateRoom}
        onOpenChange={setShowCreateRoom}
        onRoomCreated={fetchRooms}
        userId={session.user.id}
      />
    </div>
  );
};
