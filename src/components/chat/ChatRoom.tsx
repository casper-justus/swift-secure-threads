
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_private: boolean;
}

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
}

interface ChatRoomProps {
  room: ChatRoom;
  userId: string;
}

export const ChatRoom = ({ room, userId }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to real-time messages
    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (content: string, fileData?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => {
    const messageData: any = {
      room_id: room.id,
      user_id: userId,
      content: content || `Shared ${fileData?.fileName}`,
      message_type: fileData ? "file" : "text",
    };

    if (fileData) {
      messageData.file_url = fileData.fileUrl;
      messageData.file_name = fileData.fileName;
      messageData.file_type = fileData.fileType;
      messageData.file_size = fileData.fileSize;
    }

    const { error } = await supabase
      .from("messages")
      .insert(messageData);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#36393f]">
      {/* Room Header */}
      <div className="p-4 border-b border-[#202225] bg-[#36393f]">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-[#5865f2]" />
          <div>
            <h2 className="text-lg font-semibold text-white">{room.name}</h2>
            {room.description && (
              <p className="text-sm text-[#b9bbbe]">{room.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages} 
          currentUserId={userId} 
          loading={loading}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={sendMessage} />
    </div>
  );
};
