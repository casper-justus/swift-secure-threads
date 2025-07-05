
-- Create chat rooms table
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_private BOOLEAN NOT NULL DEFAULT true,
  room_key TEXT -- For storing encrypted room keys
);

-- Create room members table (for private room access)
CREATE TABLE public.room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'member',
  public_key TEXT, -- For end-to-end encryption
  UNIQUE(room_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL, -- This will store encrypted content
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_type TEXT NOT NULL DEFAULT 'text',
  encrypted_for JSONB -- Store which users this message is encrypted for
);

-- Enable RLS on all tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view rooms they are members of" 
  ON public.chat_rooms 
  FOR SELECT 
  USING (
    id IN (
      SELECT room_id FROM public.room_members 
      WHERE user_id = requesting_user_id()
    )
  );

CREATE POLICY "Users can create chat rooms" 
  ON public.chat_rooms 
  FOR INSERT 
  WITH CHECK (created_by = requesting_user_id());

CREATE POLICY "Room creators can update their rooms" 
  ON public.chat_rooms 
  FOR UPDATE 
  USING (created_by = requesting_user_id());

-- RLS Policies for room_members
CREATE POLICY "Users can view members of rooms they belong to" 
  ON public.room_members 
  FOR SELECT 
  USING (
    room_id IN (
      SELECT room_id FROM public.room_members 
      WHERE user_id = requesting_user_id()
    )
  );

CREATE POLICY "Room creators can add members" 
  ON public.room_members 
  FOR INSERT 
  WITH CHECK (
    room_id IN (
      SELECT id FROM public.chat_rooms 
      WHERE created_by = requesting_user_id()
    ) OR user_id = requesting_user_id()
  );

CREATE POLICY "Users can leave rooms" 
  ON public.room_members 
  FOR DELETE 
  USING (user_id = requesting_user_id());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in rooms they are members of" 
  ON public.messages 
  FOR SELECT 
  USING (
    room_id IN (
      SELECT room_id FROM public.room_members 
      WHERE user_id = requesting_user_id()
    )
  );

CREATE POLICY "Users can send messages to rooms they are members of" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (
    user_id = requesting_user_id() AND
    room_id IN (
      SELECT room_id FROM public.room_members 
      WHERE user_id = requesting_user_id()
    )
  );

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- Set replica identity for realtime updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
