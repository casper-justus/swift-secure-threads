import { MessageItem } from "./MessageItem";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  is_encrypted?: boolean;
  nonce?: string;
  is_pinned?: boolean;
  reply_to_message_id?: string;
}

interface Messenger {
  id: string; // This is the profile ID from 'profiles' or 'messengers' table
  user_id: string; // This is the auth.uid()
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  messengers: Record<string, Messenger>; // Expect messengers to be passed as a prop
  loading: boolean;
  onDeleteMessage: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
}

export const MessageList = ({ 
  messages, 
  currentUserId, 
  messengers, // Use this prop
  loading, 
  onDeleteMessage,
  onReply,
  onForward 
}: MessageListProps) => {

  // Removed useState and useEffect for fetching messengers, as it's now a prop.

  if (loading && messages.length === 0) { // Show loader only if messages are empty during initial load
    return (
      <div className="flex items-center justify-center h-full bg-[#36393f]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865f2]"></div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 bg-[#36393f] min-h-0">
      <div className="p-2 md:p-4 pb-20"> {/* Ensure enough padding at bottom for input overlap */}
        {messages.map((message) => {
          const messenger = messengers[message.user_id]; // Get messenger from prop
          const isOwnMessage = message.user_id === currentUserId;
          const replyToMessage = message.reply_to_message_id 
            ? messages.find(m => m.id === message.reply_to_message_id)
            : null;
          
          return (
            <MessageItem
              key={message.id}
              message={message}
              messenger={messenger}
              isOwnMessage={isOwnMessage}
              onDelete={onDeleteMessage}
              onReply={onReply}
              onForward={onForward}
              replyToMessage={replyToMessage}
            />
          );
        })}
        
        {messages.length === 0 && !loading && ( // Show "No messages" only if not loading and no messages
          <div className="text-center text-[#72767d] py-8">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
