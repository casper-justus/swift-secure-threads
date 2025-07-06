
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
  // const initialViewportHeight = useRef(window.innerHeight); // Will be handled by parent/global viewport logic
  const { toast } = useToast();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Increased max height from 120px to 160px (10rem)
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [message]);

  // Removed the previous useEffect hook for manual keyboard handling (fixed positioning)
  // New keyboard handling will be managed by overall page structure and visualViewport listener at a higher level or via CSS.

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
      ref={containerRef} // Keep ref for other potential uses, but not fixed positioning
      className="p-3 md:p-4 border-t border-[#202225] bg-[#36393f]" // Removed transition-all and isKeyboardOpen shadow here
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
              // Increased max-h from max-h-[120px] (implicit via JS) to max-h-40 (10rem = 160px)
              className="flex-1 border-0 bg-transparent text-white placeholder:text-[#72767d] focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[40px] max-h-40 py-2 px-2"
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
