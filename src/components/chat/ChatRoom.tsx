
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
  is_encrypted?: boolean;
  nonce?: string;
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
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const deletedMessage = payload.old as Message;
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id));
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

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("user_id", userId);
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete message",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Message deleted",
          description: "Your message has been deleted",
        });
      }
    } catch (error) {
      console.error("Delete message error:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (content: string, fileData?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => {
    try {
      let messageData: any = {
        room_id: room.id,
        user_id: userId,
        content: content || `Shared ${fileData?.fileName}`,
        message_type: fileData ? "file" : "text",
        is_encrypted: false,
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
    } catch (error) {
      console.error("Message sending error:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#36393f] min-h-0">
      {/* Room Header - Mobile optimized */}
      <div className="p-3 md:p-4 border-b border-[#202225] bg-[#36393f] flex-shrink-0 ml-16 md:ml-0">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 md:h-5 md:w-5 text-[#5865f2]" />
          <div>
            <h2 className="text-base md:text-lg font-semibold text-white">{room.name}</h2>
            {room.description && (
              <p className="text-xs md:text-sm text-[#b9bbbe]">{room.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages - Mobile optimized */}
      <div className="flex-1 flex flex-col min-h-0 ml-16 md:ml-0">
        <MessageList 
          messages={messages} 
          currentUserId={userId} 
          loading={loading}
          onDeleteMessage={deleteMessage}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Mobile optimized */}
      <div className="flex-shrink-0 ml-16 md:ml-0">
        <MessageInput onSendMessage={sendMessage} />
      </div>
    </div>
  );
};
