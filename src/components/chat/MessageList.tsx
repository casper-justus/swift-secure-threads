
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Download, File, Image, Video, Volume2 } from "lucide-react";
import { useState, useEffect } from "react";
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
}

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
}

export const MessageList = ({ messages, currentUserId, loading }: MessageListProps) => {
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    const userIds = [...new Set(messages.map(msg => msg.user_id))];
    fetchUserProfiles(userIds);
  }, [messages]);

  const fetchUserProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (data && !error) {
      const profilesMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, UserProfile>);
      setUserProfiles(profilesMap);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-4 w-4" />;
    
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (fileType.startsWith('audio/')) return <Volume2 className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const renderFileAttachment = (message: Message) => {
    if (!message.file_url) return null;

    const isImage = message.file_type?.startsWith('image/');
    const isVideo = message.file_type?.startsWith('video/');
    const isAudio = message.file_type?.startsWith('audio/');

    return (
      <div className="mt-2 max-w-sm">
        {isImage && (
          <img
            src={message.file_url}
            alt={message.file_name}
            className="rounded-lg max-w-full h-auto cursor-pointer"
            onClick={() => window.open(message.file_url, '_blank')}
          />
        )}
        
        {isVideo && (
          <video
            src={message.file_url}
            controls
            className="rounded-lg max-w-full h-auto"
          />
        )}
        
        {isAudio && (
          <audio
            src={message.file_url}
            controls
            className="max-w-full"
          />
        )}
        
        {!isImage && !isVideo && !isAudio && (
          <div className="bg-white/10 rounded-lg p-3 flex items-center gap-3">
            {getFileIcon(message.file_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {message.file_name}
              </p>
              {message.file_size && (
                <p className="text-xs text-gray-400">
                  {formatFileSize(message.file_size)}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(message.file_url, '_blank')}
              className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const profile = userProfiles[message.user_id];
        const isOwnMessage = message.user_id === currentUserId;
        
        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-purple-600 text-white text-xs">
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
                <span className="text-xs text-gray-400">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
              
              <div
                className={`inline-block max-w-md rounded-lg px-3 py-2 ${
                  isOwnMessage
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white'
                }`}
              >
                {message.content && (
                  <p className="text-sm break-words">{message.content}</p>
                )}
                {renderFileAttachment(message)}
              </div>
            </div>
          </div>
        );
      })}
      
      {messages.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p>No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      )}
    </div>
  );
};
