
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FileAttachment } from "./FileAttachment";
import { Shield, Trash2, Check, CheckCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { EncryptionManager } from "@/utils/encryption";
import { OnlineStatus } from "./OnlineStatus";

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

interface MessageItemProps {
  message: Message;
  messenger: Messenger | undefined;
  isOwnMessage: boolean;
  onDelete: (messageId: string) => void;
}

export const MessageItem = ({ message, messenger, isOwnMessage, onDelete }: MessageItemProps) => {
  const [showDelete, setShowDelete] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string>("");
  
  // Decrypt message content on mount
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
  
  // Check if message can be deleted (within 1 minute)
  const canDelete = () => {
    const messageTime = new Date(message.created_at).getTime();
    const now = new Date().getTime();
    const oneMinute = 60 * 1000;
    return (now - messageTime) < oneMinute && isOwnMessage;
  };

  const handleDelete = () => {
    onDelete(message.id);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getMessageStatus = () => {
    // Simple status logic - in real app this would be based on actual read receipts
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
    <div 
      className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''} group mb-4`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={messenger?.avatar_url || ""} />
          <AvatarFallback className="bg-[#5865f2] text-white text-xs">
            {messenger?.display_name?.charAt(0)?.toUpperCase() || 
             messenger?.username?.charAt(0)?.toUpperCase() || 
             '?'}
          </AvatarFallback>
        </Avatar>
        <OnlineStatus 
          userId={message.user_id} 
          className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#36393f]"
        />
      </div>
      
      <div className={`flex-1 max-w-md ${isOwnMessage ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-lg px-3 py-2 ${
            isOwnMessage
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#40444b] text-white'
          }`}
        >
          {message.is_encrypted && (
            <div className="flex items-center gap-1 mb-1">
              <Shield className="h-3 w-3 text-[#43b581]" />
              <span className="text-xs text-gray-300">Encrypted</span>
            </div>
          )}
          
          {decryptedContent && (
            <p className="text-sm break-words">{decryptedContent}</p>
          )}
          <FileAttachment message={message} />
          
          <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-300 opacity-70">
              {formatTime(message.created_at)}
            </span>
            {renderStatusIcon()}
          </div>
        </div>
        
        {canDelete() && showDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-400 mt-1"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
