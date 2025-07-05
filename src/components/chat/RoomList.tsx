
import { Button } from "@/components/ui/button";
import { Lock, Users } from "lucide-react";

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
}

export const RoomList = ({ rooms, selectedRoom, onRoomSelect }: RoomListProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Your Rooms</h3>
      <div className="space-y-2">
        {rooms.map((room) => (
          <Button
            key={room.id}
            variant={selectedRoom?.id === room.id ? "secondary" : "ghost"}
            className={`w-full justify-start h-auto p-3 ${
              selectedRoom?.id === room.id
                ? "bg-purple-600/20 border-purple-500/50"
                : "hover:bg-white/5"
            }`}
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
