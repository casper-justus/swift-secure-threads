
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";

interface Messenger {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_key: string | null;
  status: string | null;
}

interface SidebarProps {
  messenger: Messenger | null;
  userEmail: string;
  onSignOut: () => void;
  onCreateRoom: () => void;
  children: React.ReactNode;
}

export const Sidebar = ({ messenger, userEmail, onSignOut, onCreateRoom, children }: SidebarProps) => {
  return (
    <div className="w-80 bg-[#2f3136] border-r border-[#202225] flex flex-col overflow-hidden">
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
              <h1 className="text-lg font-bold text-white truncate">
                {messenger?.username || messenger?.display_name || "User"}
              </h1>
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
      
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
