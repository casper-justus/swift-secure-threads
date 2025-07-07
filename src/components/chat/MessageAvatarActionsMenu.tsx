import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Changed imports
import { Copy, Forward, MessageSquare, Pin, Trash2 } from "lucide-react";

interface MessageAvatarActionsMenuProps { // Renamed interface
  children: React.ReactNode; // This will be the trigger (Avatar)
  onDelete: () => void;
  onCopy: () => void;
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  canDelete: boolean;
  isPinned?: boolean;
}

export const MessageAvatarActionsMenu = ({ // Renamed component
  children,
  onDelete,
  onCopy,
  onReply,
  onForward,
  onPin,
  canDelete,
  isPinned = false,
}: MessageAvatarActionsMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48 bg-[#36393f] border-[#202225]"
        // Optional: align to the start/end of the trigger if needed, or adjust offset
        // sideOffset={5}
        // align="start"
      >
        <DropdownMenuItem onClick={onReply} className="text-white hover:bg-[#4f545c] cursor-pointer">
          <MessageSquare className="h-4 w-4 mr-2" />
          Reply
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onForward} className="text-white hover:bg-[#4f545c] cursor-pointer">
          <Forward className="h-4 w-4 mr-2" />
          Forward
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopy} className="text-white hover:bg-[#4f545c] cursor-pointer">
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPin} className="text-white hover:bg-[#4f545c] cursor-pointer">
          <Pin className="h-4 w-4 mr-2" />
          {isPinned ? 'Unpin' : 'Pin'}
        </DropdownMenuItem>
        {canDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-red-400 hover:bg-red-500/20 cursor-pointer">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
