
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "./FileUpload";
import { AttachmentTypeMenu } from "./AttachmentTypeMenu"; // Added
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Mic, Loader2, Paperclip } from "lucide-react"; // Added Paperclip

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // For general file attachments
  const [isUploading, setIsUploading] = useState(false); // Combined uploading state
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [acceptFileTypes, setAcceptFileTypes] = useState("*/*");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileUploadTriggerRef = useRef<HTMLButtonElement>(null); // To trigger FileUpload's input
  const attachmentButtonRef = useRef<HTMLButtonElement>(null); // Ref for the paperclip button itself

  const { toast } = useToast();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [message, selectedFile]); // Adjust height if file preview changes layout

  const uploadFileToSupabase = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `chat-files/${uniqueFileName}`;

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    return {
      fileUrl: urlData.publicUrl,
      fileName: file.name, // Use original file name for display
      fileType: file.type,
      fileSize: file.size,
    };
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedFile) return;

    setIsUploading(true);
    try {
      let fileData;
      if (selectedFile) {
        fileData = await uploadFileToSupabase(selectedFile);
      }

      onSendMessage(trimmedMessage, fileData);
      setMessage("");
      setSelectedFile(null); // Clear selected file after sending
      // isTyping state can be handled if needed
    } catch (error: any) {
      console.error("Error sending message or uploading file:", error);
      toast({
        title: "Error",
        description: error.message || "Could not send message or upload file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isUploading) { // Prevent send if uploading
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // setIsTyping(e.target.value.length > 0);
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);
      setTimeout(() => {
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.focus();
      }, 0);
    }
  };

  const handleGifSelect = (gifUrl: string, gifData?: any) => {
    const fileName = gifData?.title || `animated-${Date.now()}.gif`;
    onSendMessage("", { // GIFs are sent immediately as they are URLs, not local files
      fileUrl: gifUrl,
      fileName: fileName,
      fileType: "image/gif",
      fileSize: 0
    });
  };

  const handleFileSelectedFromUpload = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleAttachmentTypeSelect = (type: 'image' | 'video' | 'document' | 'audio' | 'camera') => {
    // For 'camera', you might need Capacitor's Camera API. For now, it's like image.
    switch (type) {
      case 'image':
        setAcceptFileTypes('image/*');
        break;
      case 'video':
        setAcceptFileTypes('video/*');
        break;
      case 'document':
        setAcceptFileTypes('.doc,.docx,.pdf,.txt,.xls,.xlsx,.ppt,.pptx');
        break;
      case 'audio':
        setAcceptFileTypes('audio/*');
        break;
      case 'camera': // Placeholder, acts like image for web
        setAcceptFileTypes('image/*');
        // Potentially trigger camera capture here if using Capacitor
        break;
      default:
        setAcceptFileTypes('*/*');
    }
    setShowAttachmentMenu(false);
    // Use a timeout to ensure state update for acceptFileTypes is processed before click
    setTimeout(() => {
      fileUploadTriggerRef.current?.click(); // Trigger the hidden file input in FileUpload
    }, 0);
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
      event.preventDefault();
      if (selectedFile) { // If a file is already selected, ask user or decide behavior
        toast({ title: "Existing file", description: "Clear current file to paste image?", variant: "info" });
        return;
      }
      setSelectedFile(imageFile); // Set pasted image as selected file for preview
      toast({ title: "Image pasted", description: "Image ready to be sent with message." });
    }
  };

  return (
    <div className="p-3 md:p-4 border-t border-[#202225] bg-[#36393f] relative">
      {/* Attachment Preview Area */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-[#40444b] rounded-lg relative">
          <FileUpload
            onFileSelected={handleFileSelectedFromUpload}
            acceptFileTypes={acceptFileTypes}
            // This FileUpload instance is now primarily for *displaying* the selected file.
            // We need to ensure it gets the `selectedFile` to display it.
            // The actual file input is hidden inside FileUpload and triggered by `fileUploadTriggerRef`.
          />
          {/* The FileUpload component itself will show a preview and a clear button */}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 bg-[#40444b] rounded-2xl border border-[#202225] overflow-hidden flex flex-col">
          {/* FileUpload for displaying preview, it's hidden if no file selected */}
          {/* This structure is a bit tricky. FileUpload needs to be in the DOM to have its input ref triggered. */}
          {/* We'll have one instance of FileUpload that's always in the DOM (but hidden) for selection,
              and its preview part is conditionally rendered or managed by selectedFile state here.
              The refactor of FileUpload handles this: it renders input if !selectedFile, else preview.
          */}
          <div className="hidden"> {/* This instance is just for the input ref, always in DOM but hidden */}
             <FileUpload
                onFileSelected={handleFileSelectedFromUpload}
                acceptFileTypes={acceptFileTypes}
                triggerRef={fileUploadTriggerRef} // Pass the trigger ref
            />
          </div>

          <div className="flex items-end">
            <div className="flex items-center px-2 py-1 relative">
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              <GifPicker onGifSelect={handleGifSelect} />

              <Button
                ref={attachmentButtonRef}
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => setShowAttachmentMenu(prev => !prev)}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              {showAttachmentMenu && (
                <AttachmentTypeMenu
                  onSelectType={handleAttachmentTypeSelect}
                  onClose={() => setShowAttachmentMenu(false)}
                />
              )}
            </div>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              onPaste={handlePaste}
              placeholder="Type a message..."
              className="flex-1 border-0 bg-transparent text-white placeholder:text-[#72767d] focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[40px] max-h-40 py-2 px-2"
              rows={1}
              disabled={isUploading}
            />
          </div>
        </div>
        
        <Button
          type="submit"
          disabled={isUploading || (!message.trim() && !selectedFile)}
          className="bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
        >
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
        {/* Fallback Mic button if no text and no file, and not uploading */}
        {!isUploading && !message.trim() && !selectedFile && (
           <Button
            type="button" // Should not submit form
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
            // onClick={handleStartRecording} // Future: Add voice recording
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </form>
    </div>
  );
};
