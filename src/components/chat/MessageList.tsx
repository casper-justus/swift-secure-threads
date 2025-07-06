
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageItem } from "./MessageItem";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#36393f]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865f2]"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#36393f]">
      {messages.map((message) => {
        const profile = userProfiles[message.user_id];
        const isOwnMessage = message.user_id === currentUserId;
        
        return (
          <MessageItem
            key={message.id}
            message={message}
            profile={profile}
            isOwnMessage={isOwnMessage}
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
  );
};
