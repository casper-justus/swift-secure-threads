
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
      <h3 className="text-sm font-medium text-gray-300 mb-3">Your Rooms</h3>
      <div className="space-y-2">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`group relative rounded-lg ${
              selectedRoom?.id === room.id
                ? "bg-purple-600/20 border border-purple-500/50"
                : "hover:bg-white/5"
            }`}
          >
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-3 hover:bg-transparent"
              onClick={() => onRoomSelect(room)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-1">
                  {room.is_private ? (
                    <Lock className="h-4 w-4 text-purple-400" />
                  ) : (
                    <Users className="h-4 w-4 text-green-400" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{room.name}</div>
                  {room.description && (
                    <div className="text-sm text-gray-400 truncate mt-1">
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
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>No rooms yet</p>
            <p className="text-sm">Create your first room to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};
