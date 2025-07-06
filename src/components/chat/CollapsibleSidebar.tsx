
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { RoomList } from "./RoomList";

interface Messenger {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_key: string | null;
  status: string | null;
}

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_private: boolean;
}

interface CollapsibleSidebarProps {
  messenger: Messenger | null;
  userEmail: string;
  onSignOut: () => void;
  onCreateRoom: () => void;
  rooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  onRoomSelect: (room: ChatRoom) => void;
  onDeleteRoom: (roomId: string) => void;
  currentUserId: string;
}

export const CollapsibleSidebar = ({
  messenger,
  userEmail,
  onSignOut,
  onCreateRoom,
  rooms,
  selectedRoom,
  onRoomSelect,
  onDeleteRoom,
  currentUserId
}: CollapsibleSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-[#2f3136] border-r border-[#202225] flex flex-col overflow-hidden transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {!isCollapsed && (
        <div className="p-4 border-b border-[#202225] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={messenger?.avatar_url || ""} />
                <AvatarFallback className="bg-[#5865f2] text-white">
                  {messenger?.display_name?.charAt(0)?.toUpperCase() || 
                   messenger?.username?.charAt(0)?.toUpperCase() || 
                   userEmail?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#b9bbbe] truncate">{userEmail}</p>
                {messenger?.status && (
                  <p className="text-xs text-[#43b581] capitalize">{messenger.status}</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onSignOut}
              className="text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="sm"
            onClick={onCreateRoom}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span>New Room</span>
          </Button>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        {!isCollapsed ? (
          <RoomList 
            rooms={rooms}
            selectedRoom={selectedRoom}
            onRoomSelect={onRoomSelect}
            onDeleteRoom={onDeleteRoom}
            currentUserId={currentUserId}
          />
        ) : (
          <div className="p-2 flex flex-col items-center gap-2">
            {rooms.slice(0, 5).map((room) => (
              <Button
                key={room.id}
                variant="ghost"
                size="sm"
                onClick={() => onRoomSelect(room)}
                className={`w-10 h-10 p-0 rounded-full ${
                  selectedRoom?.id === room.id ? 'bg-[#5865f2]/20' : 'hover:bg-[#4f545c]/50'
                }`}
                title={room.name}
              >
                {room.name.charAt(0).toUpperCase()}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-[#202225] flex justify-center">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#b9bbbe] hover:text-white hover:bg-[#4f545c]"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
