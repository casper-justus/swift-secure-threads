
import { MessageSquare, Lock } from "lucide-react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const AuthHeader = () => {
  return (
    <CardHeader className="text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <MessageSquare className="h-8 w-8 text-[#5865f2]" />
        <Lock className="h-6 w-6 text-[#5865f2]" />
      </div>
      <CardTitle className="text-2xl text-white">SecureChat</CardTitle>
      <CardDescription className="text-[#b9bbbe]">
        Private, encrypted messaging with email verification
      </CardDescription>
    </CardHeader>
  );
};
