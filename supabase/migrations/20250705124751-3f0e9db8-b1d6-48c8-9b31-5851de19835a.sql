
-- Add password validation function
CREATE OR REPLACE FUNCTION validate_password(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check minimum length (8 characters)
  IF LENGTH(password) < 8 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for at least one uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN FALSE;
  END IF;
  
  -- Check for at least one lowercase letter
  IF password !~ '[a-z]' THEN
    RETURN FALSE;
  END IF;
  
  -- Check for at least one number
  IF password !~ '[0-9]' THEN
    RETURN FALSE;
  END IF;
  
  -- Check for at least one special character
  IF password !~ '[^A-Za-z0-9]' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Add encryption keys table for second layer encryption
CREATE TABLE public.user_encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  master_key_encrypted TEXT NOT NULL, -- User's master key encrypted with their password
  salt TEXT NOT NULL, -- Salt for key derivation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on encryption keys table
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy for encryption keys
CREATE POLICY "Users can manage their own encryption keys" 
  ON public.user_encryption_keys 
  FOR ALL
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

-- Add encrypted content field to messages for second layer encryption
ALTER TABLE public.messages 
ADD COLUMN double_encrypted_content TEXT,
ADD COLUMN encryption_metadata JSONB;

-- Enable realtime for encryption keys table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_encryption_keys;
ALTER TABLE public.user_encryption_keys REPLICA IDENTITY FULL;
