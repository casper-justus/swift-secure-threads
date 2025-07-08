import React, { useRef, useEffect } from "react"; // Added useRef, useEffect
import { MessageItem } from "./MessageItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button"; // Added Button
import { Loader2 } from "lucide-react"; // Added Loader2

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
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  messengers: Record<string, Messenger>;
  loadingInitial: boolean; // Renamed from loading
  loadingOlder: boolean;
  hasMoreOldMessages: boolean;
  onFetchOlderMessages: () => void;
  onDeleteMessage: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  messageListRef: React.RefObject<HTMLDivElement>; // For scroll management from parent
}

export const MessageList = ({ 
  messages, 
  currentUserId, 
  messengers,
  loadingInitial,
  loadingOlder,
  hasMoreOldMessages,
  onFetchOlderMessages,
  onDeleteMessage,
  onReply,
  onForward,
  messageListRef
}: MessageListProps) => {
  const topObserverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreOldMessages && !loadingOlder && !loadingInitial) {
          onFetchOlderMessages();
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the element is visible
    );

    if (topObserverRef.current) {
      observer.observe(topObserverRef.current);
    }

    return () => {
      if (topObserverRef.current) {
        observer.unobserve(topObserverRef.current);
      }
    };
  }, [hasMoreOldMessages, loadingOlder, loadingInitial, onFetchOlderMessages]);


  if (loadingInitial && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[#36393f]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865f2]"></div>
      </div>
    );
  }

  return (
    <ScrollArea ref={messageListRef} className="flex-1 bg-[#36393f] min-h-0">
      <div className="p-2 md:p-4 pb-20 relative"> {/* Ensure enough padding at bottom */}

        {/* Invisible element at the top for IntersectionObserver */}
        <div ref={topObserverRef} style={{ height: '1px', position: 'absolute', top: '0' }} />

        {hasMoreOldMessages && (
          <div className="text-center my-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onFetchOlderMessages}
              disabled={loadingOlder}
              className="border-[#4f545c] text-[#b9bbbe] hover:bg-[#4f545c] hover:text-white"
            >
              {loadingOlder ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Load Older Messages
            </Button>
          </div>
        )}

        {!hasMoreOldMessages && messages.length > 0 && (
             <div className="text-center text-xs text-gray-500 py-3">
                No more messages.
            </div>
        )}

        {messages.map((message) => {
          const messenger = messengers[message.user_id];
          const isOwnMessage = message.user_id === currentUserId;
          const replyToMessage = message.reply_to_message_id 
            ? messages.find(m => m.id === message.reply_to_message_id)
            : null;
          
          return (
            // Pass data-message-id to the MessageItem's wrapper if MessageItem doesn't spread props to its root
            // Assuming MessageItem's root element will receive this prop or MessageItem handles it internally.
            // For now, we'll assume MessageItem's structure is outside this direct change,
            // but for scroll restoration to work, the element with this ID must be findable.
            // A common pattern is for MessageItem to spread ...rest onto its main div.
            <div key={message.id} data-message-id={message.id}>
                 <MessageItem
                    message={message}
                    messenger={messenger}
                    isOwnMessage={isOwnMessage}
                    onDelete={onDeleteMessage}
                    onReply={onReply}
                    onForward={onForward}
                    replyToMessage={replyToMessage}
                />
            </div>
          );
        })}
        
        {messages.length === 0 && !loadingInitial && (
          <div className="text-center text-[#72767d] py-8">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
