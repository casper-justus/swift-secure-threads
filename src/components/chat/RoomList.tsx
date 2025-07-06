
import { Button } from "@/components/ui/button";
import { Lock, Users, Trash2 } from "lucide-react";

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_private: boolean;
}

interface RoomListProps {
  rooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  onRoomSelect: (room: ChatRoom) => void;
  onDeleteRoom: (roomId: string) => void;
  currentUserId: string;
}

export const RoomList = ({ rooms, selectedRoom, onRoomSelect, onDeleteRoom, currentUserId }: RoomListProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="text-sm font-medium text-[#8e9297] mb-3 uppercase tracking-wide">Your Rooms</h3>
      <div className="space-y-2">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`group relative rounded-md ${
              selectedRoom?.id === room.id
                ? "bg-[#5865f2]/20 border border-[#5865f2]/50"
                : "hover:bg-[#4f545c]/50"
            }`}
          >
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-3 hover:bg-transparent text-left"
              onClick={() => onRoomSelect(room)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-1">
                  {room.is_private ? (
                    <Lock className="h-4 w-4 text-[#f23f42]" />
                  ) : (
                    <Users className="h-4 w-4 text-[#3ba55d]" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{room.name}</div>
                  {room.description && (
                    <div className="text-sm text-[#b9bbbe] truncate mt-1">
                      {room.description}
                    </div>
                  )}
                </div>
              </div>
            </Button>
            
            {room.created_by === currentUserId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRoom(room.id);
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-[#f23f42] hover:text-[#ed4245] hover:bg-[#f23f42]/10"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="text-center text-[#72767d] py-8">
            <p>No rooms yet</p>
            <p className="text-sm">Create your first room to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};
