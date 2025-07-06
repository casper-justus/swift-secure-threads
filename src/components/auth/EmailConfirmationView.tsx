
import { MessageSquare, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EmailConfirmationViewProps {
  email: string;
  onBackToSignIn: () => void;
}

export const EmailConfirmationView = ({ email, onBackToSignIn }: EmailConfirmationViewProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#36393f]">
      <Card className="w-full max-w-md bg-[#2f3136] border-[#40444b]">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MessageSquare className="h-8 w-8 text-[#5865f2]" />
            <Lock className="h-6 w-6 text-[#5865f2]" />
          </div>
          <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
          <CardDescription className="text-[#b9bbbe]">
            We've sent a confirmation link to {email}. Please check your email and click the link to verify your account before signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onBackToSignIn}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white"
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
