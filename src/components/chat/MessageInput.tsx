
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "./FileUpload";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import { supabase } from "@/integrations/supabase/client"; // For Supabase storage
import { useToast } from "@/hooks/use-toast"; // For toasts
import { Send, Mic, Loader2 } from "lucide-react";

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
  const [isUploadingPastedFile, setIsUploadingPastedFile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialViewportHeight = useRef(window.innerHeight);
  const { toast } = useToast();

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

  const handleGifSelect = (gifUrl: string, gifData?: any) => {
    // Send GIF as a special file type
    // gifData might contain more info like original source or dimensions, if needed later.
    // For now, we just need the URL.
    // We use a convention for fileName, and explicitly set fileType to 'image/gif'.
    // FileSize is unknown from Giphy search results directly, so 0 is a placeholder.
    const fileName = gifData?.title || `animated-${Date.now()}.gif`;
    onSendMessage("", {
      fileUrl: gifUrl,
      fileName: fileName,
      fileType: "image/gif",
      fileSize: 0
    });
  };

  const handleFileUploaded = (fileUrl: string, fileName: string, fileType: string, fileSize: number) => {
    onSendMessage("", { fileUrl, fileName, fileType, fileSize });
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData.items;
    let imageFile: File | null = null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        imageFile = items[i].getAsFile();
        break;
      }
    }

    if (imageFile) {
      event.preventDefault(); // Prevent pasting image data as text
      setIsUploadingPastedFile(true);
      toast({ title: "Pasted image detected", description: "Uploading..." });

      try {
        const fileExt = imageFile.name.split('.').pop() || 'png'; // Default to png if no extension
        const fileName = `pasted-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `chat-files/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, imageFile, {
            contentType: imageFile.type // Pass content type for better handling
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);

        handleFileUploaded(
          urlData.publicUrl,
          imageFile.name || fileName, // Use original name if available, else generated
          imageFile.type,
          imageFile.size
        );
        toast({ title: "Image pasted and uploaded successfully!" });
      } catch (error: any) {
        console.error("Pasted image upload error:", error);
        toast({
          title: "Pasted Image Upload Error",
          description: error.message || "Could not upload the pasted image.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingPastedFile(false);
      }
    }
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
              onPaste={handlePaste} // Added paste handler
              placeholder="Type a message..."
              className="flex-1 border-0 bg-transparent text-white placeholder:text-[#72767d] focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[40px] max-h-[120px] py-2 px-2"
              rows={1}
              disabled={isUploadingPastedFile} // Disable input while uploading pasted file
            />
          </div>
        </div>
        
        {isUploadingPastedFile ? (
          <Button
            type="button"
            disabled
            className="bg-purple-600 text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
          </Button>
        ) : message.trim() ? (
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
