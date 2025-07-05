
-- Add columns to profiles table for better user information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_new_user function to include username from Google auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, username, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    COALESCE(new.raw_user_meta_data ->> 'preferred_username', new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now()
  WHERE profiles.id = EXCLUDED.id;
  
  RETURN new;
END;
$$;

-- Add file attachments support to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Create storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'chat-files',
  'chat-files',
  true,
  104857600 -- 100MB limit
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policies for chat-files bucket
CREATE POLICY "Chat files are accessible to room members" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can upload chat files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

-- Add policy to allow room creators to delete their rooms
CREATE POLICY "Room creators can delete their rooms" 
  ON public.chat_rooms 
  FOR DELETE 
  USING (created_by = requesting_user_id());

-- Add policy to allow users to view other users' profiles in rooms they share
CREATE POLICY "Users can view profiles of users in shared rooms"
  ON public.profiles
  FOR SELECT
  USING (
    id = requesting_user_id() OR
    EXISTS (
      SELECT 1 FROM public.room_members rm1
      JOIN public.room_members rm2 ON rm1.room_id = rm2.room_id
      WHERE rm1.user_id = requesting_user_id() 
      AND rm2.user_id = profiles.id
    )
  );
