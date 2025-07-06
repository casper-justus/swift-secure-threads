
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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialViewportHeight = useRef(window.innerHeight);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Handle mobile keyboard detection and positioning
  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight.current - currentHeight;
      
      // If height decreased by more than 150px, keyboard is likely open
      if (heightDifference > 150) {
        setIsKeyboardOpen(true);
        // Position input above keyboard
        if (containerRef.current) {
          containerRef.current.style.position = 'fixed';
          containerRef.current.style.bottom = `${heightDifference - 100}px`;
          containerRef.current.style.left = '0';
          containerRef.current.style.right = '0';
          containerRef.current.style.zIndex = '1000';
          containerRef.current.style.backgroundColor = '#36393f';
        }
      } else {
        setIsKeyboardOpen(false);
        // Reset to normal position
        if (containerRef.current) {
          containerRef.current.style.position = 'relative';
          containerRef.current.style.bottom = 'auto';
          containerRef.current.style.left = 'auto';
          containerRef.current.style.right = 'auto';
          containerRef.current.style.zIndex = 'auto';
        }
      }
    };

    // Use visualViewport if available (better for mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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
    <div 
      ref={containerRef}
      className={`p-3 md:p-4 border-t border-[#202225] bg-[#36393f] transition-all duration-200 ${
        isKeyboardOpen ? 'shadow-lg' : ''
      }`}
    >
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
