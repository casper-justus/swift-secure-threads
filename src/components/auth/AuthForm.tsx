
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AuthHeader } from "./AuthHeader";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { EmailAuthForm } from "./EmailAuthForm";
import { EmailConfirmationView } from "./EmailConfirmationView";

export const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const validatePassword = (password: string) => {
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
    return null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const passwordError = validatePassword(password);
        if (passwordError) {
          toast({
            title: "Invalid Password",
            description: passwordError,
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        
        if (error) {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setEmailSent(true);
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link. You must confirm your email before you can sign in.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          toast({
            title: "Sign In Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? "Sign Up Error" : "Sign In Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <EmailConfirmationView
        email={email}
        onBackToSignIn={() => {
          setEmailSent(false);
          setIsSignUp(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#36393f]">
      <Card className="w-full max-w-md bg-[#2f3136] border-[#40444b]">
        <AuthHeader />
        <CardContent>
          <div className="space-y-4">
            <GoogleAuthButton onClick={handleGoogleAuth} loading={loading} />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#40444b]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#2f3136] px-2 text-[#72767d]">Or continue with email</span>
              </div>
            </div>

            <EmailAuthForm
              email={email}
              password={password}
              isSignUp={isSignUp}
              loading={loading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleAuth}
              onToggleMode={() => setIsSignUp(!isSignUp)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
