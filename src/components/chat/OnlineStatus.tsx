
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OnlineStatusProps {
  userId: string;
  className?: string;
}

interface UserStatus {
  status: string | null;
  last_seen: string | null;
}

export const OnlineStatus = ({ userId, className = "" }: OnlineStatusProps) => {
  const [userStatus, setUserStatus] = useState<UserStatus>({ status: null, last_seen: null });

  useEffect(() => {
    const fetchUserStatus = async () => {
      const { data } = await supabase
        .from("messengers")
        .select("status, last_seen")
        .eq("user_id", userId)
        .single();
      
      if (data) {
        setUserStatus(data);
      }
    };

    fetchUserStatus();

    // Subscribe to real-time status updates
    const channel = supabase
      .channel(`user-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messengers',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setUserStatus({
            status: newData.status,
            last_seen: newData.last_seen
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const isOnline = userStatus.status === 'online';
  const lastSeenTime = userStatus.last_seen ? new Date(userStatus.last_seen) : null;
  const isRecentlyActive = lastSeenTime && (Date.now() - lastSeenTime.getTime()) < 5 * 60 * 1000; // 5 minutes

  const getStatusColor = () => {
    if (isOnline) return 'bg-green-500';
    if (isRecentlyActive) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className={`rounded-full ${getStatusColor()} ${className}`} />
  );
};
