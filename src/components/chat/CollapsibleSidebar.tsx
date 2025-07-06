
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, ChevronLeft, ChevronRight, X } from "lucide-react";
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile Avatar Toggle Button - Fixed at top-left */}
      <Button
        onClick={toggleMobile}
        className="md:hidden fixed top-2 left-2 z-50 bg-transparent hover:bg-black/20 text-white rounded-full w-8 h-8 p-0 border-0"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={messenger?.avatar_url || ""} />
          <AvatarFallback className="bg-[#5865f2] text-white text-xs">
            {messenger?.display_name?.charAt(0)?.toUpperCase() || 
             messenger?.username?.charAt(0)?.toUpperCase() || 
             userEmail?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <div className={`
        bg-[#2f3136] border-r border-[#202225] flex flex-col overflow-hidden transition-all duration-300
        md:relative md:translate-x-0
        ${isMobileOpen ? 'fixed inset-y-0 left-0 w-80 z-50 translate-x-0' : 'fixed inset-y-0 left-0 w-80 z-50 -translate-x-full'}
        ${isCollapsed ? 'md:w-16' : 'md:w-80'}
      `}>
        {/* Mobile Close Button */}
        <Button
          onClick={closeMobile}
          className="md:hidden absolute top-4 right-4 z-10 bg-transparent hover:bg-[#4f545c] text-white p-2"
          size="sm"
        >
          <X className="h-4 w-4" />
        </Button>

        {(!isCollapsed || isMobileOpen) && (
          <div className="p-4 border-b border-[#202225] flex-shrink-0 pt-12 md:pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-12 w-12 md:h-10 md:w-10 flex-shrink-0">
                  <AvatarImage src={messenger?.avatar_url || ""} />
                  <AvatarFallback className="bg-[#5865f2] text-white">
                    {messenger?.display_name?.charAt(0)?.toUpperCase() || 
                     messenger?.username?.charAt(0)?.toUpperCase() || 
                     userEmail?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm md:text-xs text-[#b9bbbe] truncate">{userEmail}</p>
                  {messenger?.status && (
                    <p className="text-sm md:text-xs text-[#43b581] capitalize">{messenger.status}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onSignOut}
                className="text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] flex-shrink-0 p-2"
              >
                <LogOut className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                onCreateRoom();
                closeMobile();
              }}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white h-10 md:h-8"
            >
              <Plus className="h-5 w-5 md:h-4 md:w-4 mr-2" />
              <span>New Room</span>
            </Button>
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          {(!isCollapsed || isMobileOpen) ? (
            <RoomList 
              rooms={rooms}
              selectedRoom={selectedRoom}
              onRoomSelect={(room) => {
                onRoomSelect(room);
                closeMobile();
              }}
              onDeleteRoom={onDeleteRoom}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="p-2 flex flex-col items-center gap-2 pt-4">
              {rooms.slice(0, 5).map((room) => (
                <Button
                  key={room.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onRoomSelect(room)}
                  className={`w-12 h-12 p-0 rounded-full text-sm font-medium ${
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
            className="text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] hidden md:flex"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
};
