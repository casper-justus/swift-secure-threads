
-- Fix all RLS recursion issues by creating proper security definer functions

-- Drop all problematic policies first
DROP POLICY IF EXISTS "Users can view profiles of users in shared rooms" ON public.profiles;
DROP POLICY IF EXISTS "Users can view members of rooms they belong to" ON public.room_members;
DROP POLICY IF EXISTS "Room creators can add members" ON public.room_members;
DROP POLICY IF EXISTS "Users can send messages to rooms they are members of" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in rooms they are members of" ON public.messages;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_shared_room_profiles()
RETURNS TABLE(profile_id TEXT)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT rm2.user_id as profile_id
  FROM room_members rm1
  JOIN room_members rm2 ON rm1.room_id = rm2.room_id
  WHERE rm1.user_id = requesting_user_id();
$$;

CREATE OR REPLACE FUNCTION public.get_user_room_memberships()
RETURNS TABLE(room_id UUID)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT room_members.room_id
  FROM room_members
  WHERE user_id = requesting_user_id();
$$;

-- Recreate profiles policies without recursion
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (id = requesting_user_id());

CREATE POLICY "Users can view profiles of users in shared rooms" 
  ON public.profiles 
  FOR SELECT 
  USING (id IN (SELECT profile_id FROM public.get_user_shared_room_profiles()));

-- Recreate room_members policies
CREATE POLICY "Users can view members of rooms they belong to" 
  ON public.room_members 
  FOR SELECT 
  USING (room_id IN (SELECT room_id FROM public.get_user_room_memberships()) OR user_id = requesting_user_id());

CREATE POLICY "Room creators can add members" 
  ON public.room_members 
  FOR INSERT 
  WITH CHECK (
    room_id IN (SELECT id FROM public.chat_rooms WHERE created_by = requesting_user_id()) 
    OR user_id = requesting_user_id()
  );

-- Recreate messages policies
CREATE POLICY "Users can view messages in rooms they are members of" 
  ON public.messages 
  FOR SELECT 
  USING (room_id IN (SELECT room_id FROM public.get_user_room_memberships()));

CREATE POLICY "Users can send messages to rooms they are members of" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (
    user_id = requesting_user_id() 
    AND room_id IN (SELECT room_id FROM public.get_user_room_memberships())
  );
