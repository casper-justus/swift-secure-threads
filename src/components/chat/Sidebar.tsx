
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";

interface SidebarProps {
  userProfile: any;
  userEmail: string;
  onSignOut: () => void;
  onCreateRoom: () => void;
  children: React.ReactNode;
}

export const Sidebar = ({ userProfile, userEmail, onSignOut, onCreateRoom, children }: SidebarProps) => {
  return (
    <div className="w-80 bg-[#2f3136] border-r border-[#202225] flex flex-col">
      <div className="p-4 border-b border-[#202225]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.avatar_url || ""} />
              <AvatarFallback className="bg-[#5865f2] text-white">
                {userProfile?.name?.charAt(0)?.toUpperCase() || 
                 userProfile?.username?.charAt(0)?.toUpperCase() || 
                 userEmail?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold text-white">
                {userProfile?.username || userProfile?.name || "User"}
              </h1>
              <p className="text-xs text-[#b9bbbe]">{userEmail}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSignOut}
            className="text-[#b9bbbe] hover:text-white hover:bg-[#4f545c]"
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
      
      {children}
    </div>
  );
};
