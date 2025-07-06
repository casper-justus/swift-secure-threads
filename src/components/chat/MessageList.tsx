
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  loading: boolean;
  onDeleteMessage: (messageId: string) => void;
}

export const MessageList = ({ messages, currentUserId, loading, onDeleteMessage }: MessageListProps) => {
  const [messengers, setMessengers] = useState<Record<string, Messenger>>({});

  useEffect(() => {
    const userIds = [...new Set(messages.map(msg => msg.user_id))];
    fetchMessengers(userIds);
  }, [messages]);

  const fetchMessengers = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    const { data, error } = await supabase
      .from("messengers")
      .select("*")
      .in("user_id", userIds);

    if (data && !error) {
      const messengersMap = data.reduce((acc, messenger) => {
        acc[messenger.user_id] = messenger;
        return acc;
      }, {} as Record<string, Messenger>);
      setMessengers(messengersMap);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#36393f]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865f2]"></div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 bg-[#36393f] min-h-0">
      <div className="p-2 md:p-4 pb-20">
        {messages.map((message) => {
          const messenger = messengers[message.user_id];
          const isOwnMessage = message.user_id === currentUserId;
          
          return (
            <MessageItem
              key={message.id}
              message={message}
              messenger={messenger}
              isOwnMessage={isOwnMessage}
              onDelete={onDeleteMessage}
            />
          );
        })}
        
        {messages.length === 0 && (
          <div className="text-center text-[#72767d] py-8">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
