
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FileAttachment } from "./FileAttachment";
import { Shield, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { EncryptionManager } from "@/utils/encryption";

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
          // For now, we'll show that it's encrypted but can't decrypt without proper key exchange
          // This is a placeholder - in a real implementation, you'd have the proper keys
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

  return (
    <div 
      className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''} group`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={messenger?.avatar_url || ""} />
        <AvatarFallback className="bg-[#5865f2] text-white text-xs">
          {messenger?.display_name?.charAt(0)?.toUpperCase() || 
           messenger?.username?.charAt(0)?.toUpperCase() || 
           '?'}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">
            {messenger?.username || messenger?.display_name || 'Unknown User'}
          </span>
          {message.is_encrypted && (
            <div className="flex items-center">
              <div title="End-to-end encrypted">
                <Shield className="h-3 w-3 text-[#43b581]" />
              </div>
            </div>
          )}
          <span className="text-xs text-[#72767d]">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
          {canDelete() && showDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div
          className={`inline-block max-w-md rounded-lg px-3 py-2 ${
            isOwnMessage
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#40444b] text-white'
          }`}
        >
          {decryptedContent && (
            <p className="text-sm break-words">{decryptedContent}</p>
          )}
          <FileAttachment message={message} />
        </div>
      </div>
    </div>
  );
};
