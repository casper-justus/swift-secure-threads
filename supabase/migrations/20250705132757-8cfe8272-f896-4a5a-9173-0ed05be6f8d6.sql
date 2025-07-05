
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view members of rooms they belong to" ON public.room_members;
DROP POLICY IF EXISTS "Room creators can add members" ON public.room_members;

-- Create a security definer function to check if user is member of a room
CREATE OR REPLACE FUNCTION public.is_room_member(room_uuid UUID, user_uuid TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = room_uuid AND user_id = user_uuid
  );
$$;

-- Create a security definer function to check if user is room creator
CREATE OR REPLACE FUNCTION public.is_room_creator(room_uuid UUID, user_uuid TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_rooms 
    WHERE id = room_uuid AND created_by = user_uuid
  );
$$;

-- Recreate the policies using the security definer functions
CREATE POLICY "Users can view members of rooms they belong to" 
  ON public.room_members 
  FOR SELECT 
  USING (public.is_room_member(room_id, requesting_user_id()));

CREATE POLICY "Room creators can add members" 
  ON public.room_members 
  FOR INSERT 
  WITH CHECK (
    public.is_room_creator(room_id, requesting_user_id()) OR 
    user_id = requesting_user_id()
  );
