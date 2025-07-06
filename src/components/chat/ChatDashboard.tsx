
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
import { EncryptionManager } from "@/utils/encryption";

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
}

interface ChatDashboardProps {
  session: Session;
}

export const ChatDashboard = ({ session }: ChatDashboardProps) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [messenger, setMessenger] = useState<Messenger | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
    fetchMessenger();
    initializeEncryption();
  }, []);

  const initializeEncryption = async () => {
    const encryptionManager = EncryptionManager.getInstance();
    try {
      const keyPair = await encryptionManager.generateKeyPair();
      const publicKeyString = await encryptionManager.exportPublicKey(keyPair.publicKey);
      
      // Update messenger with public key
      await supabase
        .from("messengers")
        .update({ public_key: publicKeyString })
        .eq("user_id", session.user.id);
      
      encryptionManager.setKeyPair(keyPair);
    } catch (error) {
      console.error("Encryption initialization failed:", error);
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
        setMessenger(data as Messenger);
      }
    } catch (error: any) {
      console.error("Unexpected error fetching messenger:", error);
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
    <div className="h-screen flex bg-[#36393f] overflow-hidden">
      <Sidebar
        messenger={messenger}
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

      <div className="flex-1 flex flex-col min-h-0">
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
