
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RoomList } from "./RoomList";
import { ChatRoom } from "./ChatRoom";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { LogOut, Plus } from "lucide-react";
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
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
  }, []);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-80 bg-black/30 border-r border-purple-500/20 flex flex-col">
        <div className="p-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">SecureChat</h1>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowCreateRoom(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>New Room</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSignOut}
                className="text-gray-300 hover:text-white hover:bg-white/5"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-1">{session.user?.email}</p>
        </div>
        
        <RoomList
          rooms={rooms}
          selectedRoom={selectedRoom}
          onRoomSelect={setSelectedRoom}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1">
        {selectedRoom ? (
          <ChatRoom room={selectedRoom} userId={session.user.id} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <h2 className="text-2xl font-semibold mb-2">Select a room to start chatting</h2>
              <p>Choose a room from the sidebar or create a new one</p>
            </div>
          </div>
        )}
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
