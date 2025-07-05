
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoomList } from "./RoomList";
import { ChatRoom } from "./ChatRoom";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { UserProfile } from "../profile/UserProfile";
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

      if (error && status !== 406) { // 406 can mean single() found no rows, which is fine if profile is new
        console.error("Error fetching profile:", error.message);
        toast({
          title: "Error Fetching Profile",
          description: error.message || "Could not load your profile data.",
          variant: "destructive",
        });
      } else if (data) {
        setUserProfile(data as UserProfile); // Cast to UserProfile type
      }
    } catch (error: any) {
      console.error("Unexpected error fetching profile:", error.message);
      toast({
        title: "Profile Load Error",
        description: "An unexpected error occurred while loading your profile.",
        variant: "destructive",
      });
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
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-80 bg-black/30 border-r border-purple-500/20 flex flex-col">
        <div className="p-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userProfile?.avatar_url || ""} />
                <AvatarFallback className="bg-purple-600 text-white">
                  {userProfile?.name?.charAt(0)?.toUpperCase() || 
                   userProfile?.username?.charAt(0)?.toUpperCase() || 
                   session.user.email?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {userProfile?.username || userProfile?.name || "User"}
                </h1>
                <p className="text-xs text-gray-400">{session.user?.email}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSignOut}
              className="text-gray-300 hover:text-white hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateRoom(true)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span>New Room</span>
          </Button>
        </div>
        
        <RoomList
          rooms={rooms}
          selectedRoom={selectedRoom}
          onRoomSelect={setSelectedRoom}
          onDeleteRoom={deleteRoom}
          currentUserId={session.user.id}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <div className="border-b border-purple-500/20 bg-black/20">
            <TabsList className="bg-transparent border-none">
              <TabsTrigger 
                value="chat"
                className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300 text-gray-400"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger 
                value="profile"
                className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300 text-gray-400"
              >
                Profile
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="flex-1 m-0">
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
          </TabsContent>
          
          <TabsContent value="profile" className="flex-1 m-0 overflow-y-auto">
            <UserProfile session={session} />
          </TabsContent>
        </Tabs>
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
