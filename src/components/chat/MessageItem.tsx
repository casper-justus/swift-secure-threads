
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FileAttachment } from "./FileAttachment";
import { MessageContextMenu } from "./MessageContextMenu";
import { EmojiReactions } from "./EmojiReactions";
import { MessageReactions } from "./MessageReactions";
import { Shield, Check, CheckCheck, Reply, Pin } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { EncryptionManager } from "@/utils/encryption";
import { OnlineStatus } from "./OnlineStatus";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface MessageItemProps {
  message: Message;
  messenger: Messenger | undefined;
  isOwnMessage: boolean;
  onDelete: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  replyToMessage?: Message | null;
}

export const MessageItem = ({ 
  message, 
  messenger, 
  isOwnMessage, 
  onDelete, 
  onReply,
  onForward,
  replyToMessage 
}: MessageItemProps) => {
  const [decryptedContent, setDecryptedContent] = useState<string>("");
  const [showReactions, setShowReactions] = useState(false);
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 });
  const [isPinned, setIsPinned] = useState(false); // Initial value set by useEffect below
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const { toast } = useToast();
  const longPressTimer = useRef<NodeJS.Timeout>();
  const messageRef = useRef<HTMLDivElement>(null);

  // Effect to synchronize local isPinned state with message prop
  useEffect(() => {
    setIsPinned(message.is_pinned || false);
  }, [message.is_pinned]);
  
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const decryptMessage = async () => {
      if (message.is_encrypted && message.nonce) {
        try {
          const encryptionManager = EncryptionManager.getInstance();
          setDecryptedContent("🔒 Encrypted message");
        } catch (error) {
          console.error("Failed to decrypt message:", error);
          setDecryptedContent(message.content);
        }
      } else {
        setDecryptedContent(message.content);
      }
    };

    decryptMessage();
  }, [message]);
  
  const canDelete = () => {
    const messageTime = new Date(message.created_at).getTime();
    const now = new Date().getTime();
    const oneMinute = 60 * 1000;
    return (now - messageTime) < oneMinute && isOwnMessage;
  };

  const handleDelete = () => {
    onDelete(message.id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(decryptedContent);
    toast({
      title: "Message copied",
      description: "Message copied to clipboard",
    });
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleForward = () => {
    if (onForward) {
      onForward(message);
    }
  };

  const handlePin = async () => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_pinned: !isPinned })
        .eq('id', message.id);
        
      if (error) {
        toast({
          title: "Error",
          description: "Failed to pin/unpin message",
          variant: "destructive",
        });
      } else {
        setIsPinned(!isPinned);
        toast({
          title: isPinned ? "Message unpinned" : "Message pinned",
          description: isPinned ? "Message has been unpinned" : "Message has been pinned",
        });
      }
    } catch (error) {
      console.error("Pin message error:", error);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!currentUserId) return;
    
    try {
      // Check if user already reacted with this emoji
      const { data: existingReaction } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', message.id)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji)
        .single();

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: message.id,
            user_id: currentUserId,
            emoji: emoji,
          });

        // Send notification
        toast({
          title: "Reaction added",
          description: `Reacted with ${emoji}`,
        });
      }
    } catch (error) {
      console.error("Reaction error:", error);
    }
  };

  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    const rect = messageRef.current?.getBoundingClientRect();
    if (rect) {
      setReactionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
    
    longPressTimer.current = setTimeout(() => {
      setShowReactions(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getMessageStatus = () => {
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    if (messageAge < 1000) return 'sending';
    if (messageAge < 5000) return 'sent';
    return 'read';
  };

  const renderStatusIcon = () => {
    if (!isOwnMessage) return null;
    
    const status = getMessageStatus();
    switch (status) {
      case 'sending':
        return <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      default:
        return null;
    }
  };

  return (
    <>
      <div 
        ref={messageRef}
        className={`flex gap-2 md:gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''} group mb-3 md:mb-4`}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
      >
        <MessageContextMenu
          onDelete={handleDelete}
          onCopy={handleCopy}
          onReply={handleReply}
          onForward={handleForward}
          onPin={handlePin}
          canDelete={canDelete()}
          isPinned={isPinned}
        >
          <div className="relative flex-shrink-0 cursor-pointer">
            <Avatar className="h-8 w-8 md:h-10 md:w-10">
              <AvatarImage src={messenger?.avatar_url || ""} />
              <AvatarFallback className="bg-[#5865f2] text-white text-xs md:text-sm">
                {messenger?.display_name?.charAt(0)?.toUpperCase() || 
                 messenger?.username?.charAt(0)?.toUpperCase() || 
                 '?'}
              </AvatarFallback>
            </Avatar>
            <OnlineStatus 
              userId={message.user_id} 
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-[#36393f]"
            />
          </div>
        </MessageContextMenu>
        
        <div className={`flex-1 max-w-[85%] md:max-w-md ${isOwnMessage ? 'text-right' : ''}`}>
          {replyToMessage && (
            <div className="mb-2 p-2 bg-[#2f3136] rounded-md border-l-2 border-[#5865f2]">
              <div className="flex items-center gap-1 mb-1">
                <Reply className="h-3 w-3 text-[#5865f2]" />
                <span className="text-xs text-[#5865f2]">Reply to</span>
              </div>
              <p className="text-xs text-gray-300 truncate">{replyToMessage.content}</p>
            </div>
          )}

          <div
            className={`inline-block rounded-2xl px-3 py-2 md:px-4 md:py-3 break-words ${
              isOwnMessage
                ? 'bg-[#5865f2] text-white rounded-br-md'
                : 'bg-[#40444b] text-white rounded-bl-md'
            }`}
          >
            {isPinned && (
              <div className="flex items-center gap-1 mb-1">
                <Pin className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-yellow-500">Pinned</span>
              </div>
            )}

            {message.is_encrypted && (
              <div className="flex items-center gap-1 mb-1">
                <Shield className="h-3 w-3 text-[#43b581]" />
                <span className="text-xs text-gray-300">Encrypted</span>
              </div>
            )}
            
            {decryptedContent && (
              <p className="text-sm md:text-base break-words">{decryptedContent}</p>
            )}
            <FileAttachment message={message} />
          </div>

          {currentUserId && (
            <MessageReactions messageId={message.id} currentUserId={currentUserId} />
          )}
          
          <div className={`flex items-center gap-1 mt-1 px-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-400">
              {formatTime(message.created_at)}
            </span>
            {renderStatusIcon()}
          </div>
        </div>
      </div>

      <EmojiReactions
        show={showReactions}
        onReaction={handleReaction}
        onClose={() => setShowReactions(false)}
        position={reactionPosition}
      />
    </>
  );
};
