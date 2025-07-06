import { useState } from 'react';
import { Message } from '@/integrations/supabase/types'; // Assuming Message type is exported or defined here
import { Pin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // For sender avatar
import { supabase } from '@/integrations/supabase/client'; // For unpinning
import { useToast } from '@/hooks/use-toast';

// Re-define Message interface if not easily importable from a central place
// For now, assuming it's similar to the one in ChatRoom.tsx
interface Messenger {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}
interface PinnedMessage extends Message {
  // id, content, created_at, user_id, is_pinned are from Message type
  messenger?: Messenger; // Add messenger info if fetched and passed
}

interface PinnedMessageBarProps {
  pinnedMessages: PinnedMessage[];
  messengers: Record<string, Messenger>; // Pass messengers similar to MessageList
  currentUserId: string; // To check if user can unpin (if rules were different)
  // onNavigateToMessage: (messageId: string) => void; // For jumping to message in chat
}

export const PinnedMessageBar = ({
  pinnedMessages,
  messengers,
  currentUserId,
  // onNavigateToMessage,
}: PinnedMessageBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleUnpinMessage = async (messageId: string) => {
    // RLS policy allows any room member to unpin.
    // The update will trigger real-time event in ChatRoom.tsx which will update pinnedMessages list.
    const { error } = await supabase
      .from('messages')
      .update({ is_pinned: false })
      .eq('id', messageId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to unpin message. ' + error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Message Unpinned',
        description: 'The message has been successfully unpinned.',
      });
      // The list will update via real-time subscription in ChatRoom.tsx
    }
  };

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return null; // Don't render anything if there are no pinned messages
  }

  const latestPinnedMessage = pinnedMessages.length > 0 ? pinnedMessages[0] : null; // Ensure pinnedMessages is not empty

  return (
    <div className="flex-shrink-0 p-2 bg-[#2f3136] border-b border-[#202225] text-sm text-white ml-12 md:ml-0"> {/* Added flex-shrink-0 */}
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-[#3a3e45] p-1 rounded transition-colors duration-150"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0"> {/* Added min-w-0 for better truncation */}
          <Pin className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          {isExpanded ? (
            <span>{pinnedMessages.length} Pinned Message{pinnedMessages.length !== 1 ? 's' : ''}</span>
          ) : (
            <span className="truncate">
              {pinnedMessages.length === 1 && latestPinnedMessage?.content ?
                `Pinned: ${latestPinnedMessage.content}` :
                `${pinnedMessages.length} Pinned Messages`}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 flex-shrink-0" />}
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
          {pinnedMessages.map((msg) => {
            const messenger = messengers[msg.user_id];
            return (
              <div
                key={msg.id}
                className="p-2 bg-[#36393f] rounded-md flex items-start justify-between gap-2 hover:bg-[#3c4046] cursor-pointer transition-colors duration-150"
                // onClick={() => onNavigateToMessage(msg.id)} // Add navigation later, makes item clickable
              >
                <div className="flex items-start gap-2 flex-grow min-w-0"> {/* Ensure this div allows truncation within */}
                  <Avatar className="h-6 w-6 mt-0.5 flex-shrink-0">
                    <AvatarImage src={messenger?.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-[#5865f2]"> {/* Added fallback bg color */}
                      {messenger?.display_name?.charAt(0)?.toUpperCase() || messenger?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-grow min-w-0">
                    <div className="text-xs text-gray-400 font-medium">
                      {messenger?.display_name || messenger?.username || 'Unknown User'}
                    </div>
                    <p className="text-sm text-gray-200 truncate"> {/* Removed break-all, rely on truncate */}
                      {msg.content}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0 rounded-full p-1" // Made slightly larger, rounded, with bg on hover
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent click on parent div
                    handleUnpinMessage(msg.id);
                  }}
                  title="Unpin message"
                >
                  <X className="h-4 w-4" /> {/* Icon size can be adjusted if needed */}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
