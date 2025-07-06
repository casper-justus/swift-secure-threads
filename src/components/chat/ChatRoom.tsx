import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { PinnedMessageBar } from "./PinnedMessageBar";
import { Lock, X, Reply, Forward, Pin as PinIcon } from "lucide-react"; // Renamed Pin to PinIcon to avoid conflict
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// Define Messenger interface if not centrally available
interface Messenger {
  id: string; // This is the profile ID from 'profiles' table, not auth user id
  user_id: string; // This is the auth.uid()
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

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
  is_pinned?: boolean;
  reply_to_message_id?: string;
}

interface ChatRoomProps {
  room: ChatRoom;
  userId: string;
}

export const ChatRoom = ({ room, userId }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [messengers, setMessengers] = useState<Record<string, Messenger>>({});
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRoomData();

    const messageChannel = supabase
      .channel(`room-${room.id}-messages-v2`) // Ensure unique channel name if old one is cached
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
          setMessages(prev => [...prev, newMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
          if (newMessage.is_pinned) {
            setPinnedMessages(prev => [...prev, newMessage].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          }
          // Fetch messenger info if not already present
          if (newMessage.user_id && !messengers[newMessage.user_id]) {
            fetchMessengerById(newMessage.user_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          // Update in main messages list
          setMessages(prev => prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
                                   .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));

          // Update in pinned messages list
          setPinnedMessages(prevPinned => {
            const isAlreadyPinned = prevPinned.some(pm => pm.id === updatedMessage.id);
            if (updatedMessage.is_pinned) {
              if (isAlreadyPinned) {
                // Message was already pinned, update its content
                return prevPinned.map(pm => pm.id === updatedMessage.id ? updatedMessage : pm)
                                 .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              } else {
                // Message was not pinned, now it is, add it
                return [...prevPinned, updatedMessage]
                         .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              }
            } else {
              // Message was unpinned, remove it
              return prevPinned.filter(pm => pm.id !== updatedMessage.id);
            }
          });
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
          setPinnedMessages(prev => prev.filter(pm => pm.id !== deletedMessage.id));
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to messages in room ${room.id}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error in room ${room.id}:`, err);
          toast({
            title: "Real-time connection error",
            description: "Could not connect to real-time updates. Please refresh.",
            variant: "destructive",
          });
        }
      });

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [room.id, toast]);

  useEffect(() => {
    // Only scroll if not replying, to avoid jumping while typing a reply.
    // User can manually scroll if needed.
    if (!replyingTo) {
      scrollToBottom();
    }
  }, [messages, replyingTo]);

  // Handle global clicks to close emoji reactions (existing useEffect)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.emoji-reactions')) {
        const event = new CustomEvent('closeEmojiReactions');
        window.dispatchEvent(event);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const fetchMessengerById = async (messengerUserId: string) => {
    if (messengers[messengerUserId]) return; // Already fetched or fetching

    try {
      const { data, error } = await supabase
        .from("messengers") // Ensure this table name is correct
        .select("*")
        .eq("user_id", messengerUserId) // Assuming 'user_id' in 'messengers' is the auth user id
        .single();

      if (error) {
        console.warn(`Failed to fetch messenger profile for ${messengerUserId}:`, error.message);
        return;
      }
      if (data) {
        setMessengers(prev => ({ ...prev, [messengerUserId]: data as Messenger }));
      }
    } catch (e) {
      console.warn(`Exception fetching messenger profile for ${messengerUserId}:`, e);
    }
  };


  const fetchRoomData = async () => {
    setLoading(true);
    try {
      // Fetch all messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id)
        .order("created_at", { ascending: true });
      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Fetch pinned messages
      const { data: pinnedMessagesData, error: pinnedMessagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id)
        .eq("is_pinned", true)
        .order("created_at", { ascending: false }); // Order for display in PinnedMessageBar
      if (pinnedMessagesError) throw pinnedMessagesError;
      setPinnedMessages(pinnedMessagesData || []);

      // Collect all unique user IDs from both lists
      const userIdsToFetch = new Set<string>();
      (messagesData || []).forEach(msg => userIdsToFetch.add(msg.user_id));
      (pinnedMessagesData || []).forEach(msg => userIdsToFetch.add(msg.user_id));

      if (userIdsToFetch.size > 0) {
        const { data: messengerData, error: messengerError } = await supabase
          .from("messengers") // Assuming 'messengers' is the correct table name for profiles
          .select("*")
          .in("user_id", Array.from(userIdsToFetch)); // Assuming 'user_id' in messengers links to auth.uid

        if (messengerError) throw messengerError;

        const messengersMap = (messengerData || []).reduce((acc, profile) => {
          acc[profile.user_id] = profile as Messenger; // Ensure 'user_id' is the key
          return acc;
        }, {} as Record<string, Messenger>);
        setMessengers(messengersMap);
      }

    } catch (error: any) {
      console.error("Failed to fetch room data:", error.message);
      toast({
        title: "Error",
        description: "Failed to fetch messages or pinned messages.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    // Debounce or make conditional if causing issues with rapid updates
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

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleForward = (message: Message) => {
    setForwardingMessage(message);
    // You can implement a room selection dialog here
    toast({
      title: "Forward message",
      description: "Forward functionality will be implemented with room selection",
    });
  };

  const sendMessage = async (content: string, fileData?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => {
    try {
      let messageData: Partial<Message> = { // Use Partial<Message> for better type safety
        room_id: room.id,
        user_id: userId,
        content: content, // Default content
        message_type: "text", // Default message_type
        is_encrypted: false, // Assuming default, adjust if encryption logic is present
        // id, created_at are handled by DB
      };

      // Add reply reference if replying
      if (replyingTo) {
        messageData.reply_to_message_id = replyingTo.id;
      }

      if (fileData) {
        messageData.file_url = fileData.fileUrl;
        messageData.file_name = fileData.fileName;
        messageData.file_type = fileData.fileType; // e.g., "image/jpeg", "application/pdf", "image/gif"
        messageData.file_size = fileData.fileSize;

        // Determine message_type based on fileType
        if (fileData.fileType === "image/gif" && !content) { // Check !content to distinguish from file upload with caption
          messageData.message_type = "gif";
          // For GIFs from Giphy, content might be empty, or we can use the GIF title or a generic placeholder
          messageData.content = content || fileData.fileName || "GIF";
        } else {
          messageData.message_type = "file"; // Or derive more specific types like 'image', 'video', 'audio'
          messageData.content = content || fileData.fileName || "File"; // Use content if provided (caption), else filename
        }
      } else if (!content) {
        // Avoid sending empty text messages if there's no content and no file
        toast({ title: "Cannot send an empty message", variant: "destructive" });
        return;
      }
      // If it's a pure text message, messageData.content and messageData.message_type are already set

      const { error } = await supabase
        .from("messages")
        .insert(messageData as Message); // Cast to Message after ensuring all required fields are present or defaulted

      if (error) {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      } else {
        // Clear reply state after sending
        setReplyingTo(null);
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
      {/* Room Header - Mobile optimized with left margin for avatar */}
      <div className="p-3 md:p-4 border-b border-[#202225] bg-[#36393f] flex-shrink-0 ml-12 md:ml-0">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 md:h-5 md:w-5 text-[#5865f2]" />
          <div>
            <h2 className="text-base md:text-lg font-semibold text-white">{room.name}</h2>
            {room.description && (
              <p className="text-xs md:text-sm text-[#b9bbbe] truncate max-w-xs md:max-w-md">{room.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Pinned Messages Bar Integration */}
      <PinnedMessageBar
        pinnedMessages={pinnedMessages}
        messengers={messengers}
        currentUserId={userId}
      />

      {/* Messages - Mobile optimized with left margin for avatar */}
      <div className="flex-1 flex flex-col min-h-0 ml-12 md:ml-0"> {/* Consider if ml-12 is still needed with sidebar */}
        <MessageList
          messages={messages}
          currentUserId={userId}
          messengers={messengers} // Pass messengers map to MessageList
          loading={loading}
          onDeleteMessage={deleteMessage}
          onReply={handleReply}
          onForward={handleForward}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 p-2 bg-[#2f3136] border-t border-[#202225] ml-12 md:ml-0">
          <Reply className="h-4 w-4 text-[#5865f2]" />
          <div className="flex-1">
            <p className="text-xs text-[#5865f2]">Replying to</p>
            <p className="text-sm text-white truncate">{replyingTo.content}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message Input - Mobile optimized with left margin for avatar */}
      <div className="flex-shrink-0 ml-12 md:ml-0">
        <MessageInput onSendMessage={sendMessage} />
      </div>
    </div>
  );
};
