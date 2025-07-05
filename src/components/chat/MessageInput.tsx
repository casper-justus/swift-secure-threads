
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

export const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="p-4 border-t border-purple-500/20 bg-black/20">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400"
        />
        <Button
          type="submit"
          disabled={!message.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white"
        >
          <Send className="h-4 w-4 mr-1" />
          <span>Send</span>
        </Button>
      </form>
    </div>
  );
};
