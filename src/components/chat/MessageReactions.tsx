
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface MessageReactionsProps {
  messageId: string;
  currentUserId: string;
  isOwnMessage?: boolean; // Added isOwnMessage prop
}

export const MessageReactions = ({ messageId, currentUserId, isOwnMessage = false }: MessageReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchReactions();
    
    // Subscribe to reaction changes
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (data && !error) {
        setReactions(data);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  const handleReactionClick = async (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji && r.user_id === currentUserId);
    
    if (existingReaction) {
      // Remove reaction
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);
        
      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove reaction",
          variant: "destructive",
        });
      }
    } else {
      // Add reaction
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji: emoji,
        });
        
      if (error) {
        toast({
          title: "Error",
          description: "Failed to add reaction",
          variant: "destructive",
        });
      }
    }
  };

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const isUserReacted = reactionList.some(r => r.user_id === currentUserId);
        const count = reactionList.length;
        
        return (
          <button
            key={emoji}
            onClick={() => handleReactionClick(emoji)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
              isUserReacted 
                ? 'bg-[#5865f2] text-white' 
                : 'bg-[#40444b] text-gray-300 hover:bg-[#4f545c]'
            }`}
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
};
