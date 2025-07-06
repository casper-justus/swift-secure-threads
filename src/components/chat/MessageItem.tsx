
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileAttachment } from "./FileAttachment";

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

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface MessageItemProps {
  message: Message;
  profile: UserProfile | undefined;
  isOwnMessage: boolean;
}

export const MessageItem = ({ message, profile, isOwnMessage }: MessageItemProps) => {
  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={profile?.avatar_url || ""} />
        <AvatarFallback className="bg-[#5865f2] text-white text-xs">
          {profile?.name?.charAt(0)?.toUpperCase() || 
           profile?.username?.charAt(0)?.toUpperCase() || 
           '?'}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">
            {profile?.username || profile?.name || 'Unknown User'}
          </span>
          <span className="text-xs text-[#72767d]">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>
        
        <div
          className={`inline-block max-w-md rounded-lg px-3 py-2 ${
            isOwnMessage
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#40444b] text-white'
          }`}
        >
          {message.content && (
            <p className="text-sm break-words">{message.content}</p>
          )}
          <FileAttachment message={message} />
        </div>
      </div>
    </div>
  );
};
