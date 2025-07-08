import { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback
import { supabase } from "@/integrations/supabase/client";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { PinnedMessageBar } from "./PinnedMessageBar";
import { Lock, X, Reply, Forward, Pin as PinIcon, Loader2 } from "lucide-react"; // Added Loader2
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const MESSAGES_PER_PAGE = 30;

// Define Messenger interface if not centrally available
interface Messenger {
  id: string; // This is the profile ID from 'profiles' table, not auth user id
  user_id: string; // This is the auth.uid()
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface ChatRoomDef { // Renamed to avoid conflict with component name
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
  room: ChatRoomDef; // Use renamed interface
  userId: string;
}

export const ChatRoom = ({ room, userId }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [messengers, setMessengers] = useState<Record<string, Messenger>>({});
  const [loadingInitial, setLoadingInitial] = useState(true); // Renamed for clarity
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOldMessages, setHasMoreOldMessages] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null); // Ref for the scrollable message list container

  const fetchMessengerProfiles = useCallback(async (userIds: string[]) => {
    const idsToFetch = userIds.filter(id => !messengers[id]);
    if (idsToFetch.length === 0) return;

    try {
      const { data: messengerData, error: messengerError } = await supabase
        .from("messengers")
        .select("*")
        .in("user_id", idsToFetch);

      if (messengerError) throw messengerError;

      if (messengerData) {
        const newMessengersMap = messengerData.reduce((acc, profile) => {
          acc[profile.user_id] = profile as Messenger;
          return acc;
        }, {} as Record<string, Messenger>);
        setMessengers(prev => ({ ...prev, ...newMessengersMap }));
      }
    } catch (error: any) {
      console.warn("Failed to fetch some messenger profiles:", error.message);
      // Partial success is okay, don't need to toast for every minor profile fetch issue
    }
  }, [messengers]); // Dependency: messengers map

  const fetchInitialMessages = useCallback(async () => {
    setLoadingInitial(true);
    setHasMoreOldMessages(true); // Reset for room changes
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false }) // Fetch newest first for pagination
        .limit(MESSAGES_PER_PAGE);

      if (messagesError) throw messagesError;

      const newMessages = (messagesData || []).reverse(); // Reverse to display oldest first in the chunk
      setMessages(newMessages);

      if ((messagesData?.length || 0) < MESSAGES_PER_PAGE) {
        setHasMoreOldMessages(false);
      }

      const userIdsToFetch = new Set<string>();
      newMessages.forEach(msg => userIdsToFetch.add(msg.user_id));
      if (userIdsToFetch.size > 0) {
        fetchMessengerProfiles(Array.from(userIdsToFetch));
      }

      // Fetch pinned messages (can be separate as it's a smaller list)
      const { data: pinnedData, error: pinnedError } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id)
        .eq("is_pinned", true)
        .order("created_at", { ascending: false });
      if (pinnedError) throw pinnedError;
      setPinnedMessages(pinnedData || []);
      (pinnedData || []).forEach(msg => userIdsToFetch.add(msg.user_id)); // Also fetch their profiles if not already
      if (userIdsToFetch.size > 0) { // Re-check if pinned messages added new users
         fetchMessengerProfiles(Array.from(userIdsToFetch));
      }


    } catch (error: any) {
      console.error("Failed to fetch initial room data:", error.message);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive",
      });
    } finally {
      setLoadingInitial(false);
    }
  }, [room.id, toast, fetchMessengerProfiles]);

  const fetchOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMoreOldMessages || messages.length === 0) return;

    setLoadingOlder(true);
    const oldestMessageTimestamp = messages[0]?.created_at;
    if (!oldestMessageTimestamp) {
      setLoadingOlder(false);
      setHasMoreOldMessages(false);
      return;
    }

    try {
      const { data: olderMessagesData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id)
        .lt("created_at", oldestMessageTimestamp)
        .order("created_at", { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;

      const newOlderMessages = (olderMessagesData || []).reverse();

      // Preserve scroll position
      const messageListEl = messageListRef.current;
      const oldScrollHeight = messageListEl?.scrollHeight || 0;
      const oldScrollTop = messageListEl?.scrollTop || 0;
      const firstVisibleMessageIdBeforeLoad = messages[0]?.id;


      setMessages(prev => [...newOlderMessages, ...prev]);

      if ((olderMessagesData?.length || 0) < MESSAGES_PER_PAGE) {
        setHasMoreOldMessages(false);
      }

      const userIdsToFetch = new Set<string>();
      newOlderMessages.forEach(msg => userIdsToFetch.add(msg.user_id));
      if (userIdsToFetch.size > 0) {
        fetchMessengerProfiles(Array.from(userIdsToFetch));
      }

      // Restore scroll after DOM updates
      if (messageListEl && firstVisibleMessageIdBeforeLoad) {
         // Wait for DOM to update
        requestAnimationFrame(() => {
            const firstMessageNow = messageListEl.querySelector(`[data-message-id="${firstVisibleMessageIdBeforeLoad}"]`);
            if (firstMessageNow) {
                 messageListEl.scrollTop = (firstMessageNow as HTMLElement).offsetTop - oldScrollTop + (messageListEl.scrollHeight - oldScrollHeight) ;
            } else {
                 // Fallback: adjust based on height change
                 messageListEl.scrollTop = oldScrollTop + (messageListEl.scrollHeight - oldScrollHeight);
            }
        });
      }


    } catch (error: any) {
      console.error("Failed to fetch older messages:", error.message);
      toast({
        title: "Error",
        description: "Failed to load older messages.",
        variant: "destructive",
      });
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMoreOldMessages, messages, room.id, toast, fetchMessengerProfiles]);


  useEffect(() => {
    fetchInitialMessages(); // Fetch initial messages when room changes

    const messageChannel = supabase
      .channel(`room-${room.id}-messages-v3`) // Incremented version for safety
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          const newMessage = payload.new as Message;
          // Add new message only if it's not already in the list (e.g., from optimistic update)
          setMessages(prev => {
            if (prev.find(msg => msg.id === newMessage.id)) return prev;
            return [...prev, newMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
          if (newMessage.is_pinned) {
             setPinnedMessages(prev => {
                if (prev.find(msg => msg.id === newMessage.id)) return prev;
                return [...prev, newMessage].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
             });
          }
          if (newMessage.user_id) {
            fetchMessengerProfiles([newMessage.user_id]);
          }
          // Auto-scroll for new messages if user is near the bottom
          if (messageListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
            if (scrollHeight - scrollTop - clientHeight < 200) { // If scrolled within 200px of bottom
              setTimeout(() => scrollToBottom(true), 0); // Smooth scroll to new message
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev => prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
                                   .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
          setPinnedMessages(prevPinned => {
            const isAlreadyPinned = prevPinned.some(pm => pm.id === updatedMessage.id);
            if (updatedMessage.is_pinned) {
              return isAlreadyPinned
                ? prevPinned.map(pm => pm.id === updatedMessage.id ? updatedMessage : pm).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                : [...prevPinned, updatedMessage].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            } else {
              return prevPinned.filter(pm => pm.id !== updatedMessage.id);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          const deletedMessageId = payload.old.id as string;
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessageId));
          setPinnedMessages(prev => prev.filter(pm => pm.id !== deletedMessageId));
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') console.log(`Subscribed to messages in room ${room.id}`);
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error in room ${room.id}:`, err);
          toast({ title: "Real-time connection error", variant: "destructive" });
        }
      });

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [room.id, toast, fetchInitialMessages, fetchMessengerProfiles]); // Added fetchInitialMessages

  useEffect(() => {
    if (!replyingTo && messages.length > 0 && !loadingInitial && !loadingOlder) {
        // Scroll to bottom only after initial load and not when loading older messages
        // And only if we are not currently in a reply state (which might open keyboard)
        const lastMessage = messages[messages.length-1];
        // If the last message is from the current user, scroll immediately.
        // Otherwise, might be less aggressive or conditional based on user scroll position.
        if(lastMessage?.user_id === userId) {
            scrollToBottom(true); // Smooth scroll for own new messages
        } else if (messageListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
            if (scrollHeight - scrollTop - clientHeight < 300) { // If user is already near bottom
                 scrollToBottom(true);
            }
        }
    }
  }, [messages, replyingTo, loadingInitial, loadingOlder, userId]);


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

  const scrollToBottom = (smooth: boolean = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    }
  };

  const deleteMessage = async (messageId: string) => {
    // ... (existing deleteMessage logic remains the same)
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

      {/* Message List container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden ml-12 md:ml-0"> {/* Added overflow-hidden, ensure min-h-0 */}
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
        <div className="flex-shrink-0 flex items-center gap-2 p-2 bg-[#2f3136] border-t border-[#202225] ml-12 md:ml-0"> {/* Added flex-shrink-0 */}
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
