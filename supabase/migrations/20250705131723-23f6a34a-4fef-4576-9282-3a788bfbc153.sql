
-- Fix the handle_new_user function to handle duplicate emails gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, username, email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'username',
    new.email
  )
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    updated_at = now()
  WHERE profiles.id = EXCLUDED.id;
  
  RETURN new;
END;
$$;
