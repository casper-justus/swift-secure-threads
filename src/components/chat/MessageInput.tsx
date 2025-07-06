
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "./FileUpload";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import { Send, Mic } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string, fileData?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => void;
}

export const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);
      
      // Set cursor position after the emoji
      setTimeout(() => {
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.focus();
      }, 0);
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    // For now, send GIF URL as text message
    onSendMessage(`GIF: ${gifUrl}`);
  };

  const handleFileUploaded = (fileUrl: string, fileName: string, fileType: string, fileSize: number) => {
    onSendMessage("", { fileUrl, fileName, fileType, fileSize });
  };

  return (
    <div className="p-3 md:p-4 border-t border-[#202225] bg-[#36393f]">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 bg-[#40444b] rounded-2xl border border-[#202225] overflow-hidden">
          <div className="flex items-end">
            <div className="flex items-center px-2 py-1">
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              <GifPicker onGifSelect={handleGifSelect} />
              <FileUpload onFileUploaded={handleFileUploaded} />
            </div>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 border-0 bg-transparent text-white placeholder:text-[#72767d] focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[40px] max-h-[120px] py-2 px-2"
              rows={1}
            />
          </div>
        </div>
        
        {message.trim() ? (
          <Button
            type="submit"
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </form>
    </div>
  );
};
