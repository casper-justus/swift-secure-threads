
-- Create message_reactions table for emoji reactions
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Add RLS policies for message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view all reactions
CREATE POLICY "Users can view all reactions" 
  ON public.message_reactions 
  FOR SELECT 
  USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can add their own reactions" 
  ON public.message_reactions 
  FOR INSERT 
  WITH CHECK (user_id = requesting_user_id());

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions" 
  ON public.message_reactions 
  FOR DELETE 
  USING (user_id = requesting_user_id());

-- Add columns to messages table for reply and pin functionality
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Enable realtime for message_reactions
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
