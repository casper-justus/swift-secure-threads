
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Forward, MessageSquare, Pin, Trash2 } from "lucide-react";

interface MessageContextMenuProps {
  children: React.ReactNode;
  onDelete: () => void;
  onCopy: () => void;
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  canDelete: boolean;
}

export const MessageContextMenu = ({
  children,
  onDelete,
  onCopy,
  onReply,
  onForward,
  onPin,
  canDelete,
}: MessageContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-[#36393f] border-[#202225]">
        <ContextMenuItem onClick={onReply} className="text-white hover:bg-[#4f545c]">
          <MessageSquare className="h-4 w-4 mr-2" />
          Reply
        </ContextMenuItem>
        <ContextMenuItem onClick={onForward} className="text-white hover:bg-[#4f545c]">
          <Forward className="h-4 w-4 mr-2" />
          Forward
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopy} className="text-white hover:bg-[#4f545c]">
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={onPin} className="text-white hover:bg-[#4f545c]">
          <Pin className="h-4 w-4 mr-2" />
          Pin
        </ContextMenuItem>
        {canDelete && (
          <ContextMenuItem onClick={onDelete} className="text-red-400 hover:bg-red-500/20">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
