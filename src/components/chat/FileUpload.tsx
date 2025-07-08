
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, X, FileText, Image as ImageIcon, Video as VideoIcon, Volume2 as AudioIcon } from "lucide-react";

interface FileUploadProps {
  onFileSelected: (file: File | null) => void;
  acceptFileTypes?: string;
  triggerRef?: React.RefObject<HTMLButtonElement>; // For triggering file input from outside
}

export const FileUpload = ({ onFileSelected, acceptFileTypes = "*/*", triggerRef }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedFile) {
      if (selectedFile.type.startsWith("image/") || selectedFile.type.startsWith("video/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreviewUrl(null); // No preview for non-image/video files
      }
      onFileSelected(selectedFile);
    } else {
      setPreviewUrl(null);
      onFileSelected(null);
    }
    // Cleanup function to revoke object URL
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [selectedFile]); // Removed onFileSelected from dependencies to prevent potential loops if parent re-renders

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 100MB.",
          variant: "destructive",
        });
        // Clear the input so the same file can't be re-selected immediately if it was invalid
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
    }
     // Reset the input value to allow selecting the same file again if it was cleared
    if(fileInputRef.current) event.target.value = "";
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onFileSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Expose openFileDialog via triggerRef
  useEffect(() => {
    if (triggerRef && triggerRef.current) {
      triggerRef.current.onclick = openFileDialog;
    }
  }, [triggerRef, openFileDialog]);


  const renderFilePreview = () => {
    if (!selectedFile) return null;

    if (previewUrl && selectedFile.type.startsWith("image/")) {
      return <img src={previewUrl} alt="Preview" className="max-h-20 max-w-full rounded object-contain" />;
    }
    if (previewUrl && selectedFile.type.startsWith("video/")) {
      return <video src={previewUrl} controls className="max-h-20 max-w-full rounded object-contain" />;
    }
    // Generic file icon for other types
    let icon = <FileText className="h-8 w-8 text-gray-400" />;
    if (selectedFile.type.startsWith("audio/")) icon = <AudioIcon className="h-8 w-8 text-gray-400" />;

    return (
      <div className="flex flex-col items-center p-2">
        {icon}
        <span className="text-xs text-gray-300 mt-1 truncate max-w-[100px]">{selectedFile.name}</span>
      </div>
    );
  };

  // This component will now primarily be controlled by MessageInput for showing the file selection UI.
  // It will render the preview and clear button if a file is selected.
  // The actual paperclip button to INITIATE selection will be in MessageInput, which then calls openFileDialog.

  if (!selectedFile) {
    // Render nothing if no file is selected; MessageInput handles the trigger.
    // The input itself needs to be in the DOM to be triggered.
    return (
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept={acceptFileTypes}
      />
    );
  }

  return (
    <div className="relative p-2 bg-black/20 rounded-md">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept={acceptFileTypes}
      />
      {renderFilePreview()}
      <Button
        size="icon"
        variant="ghost"
        onClick={clearFile}
        className="absolute top-0 right-0 h-6 w-6 text-gray-400 hover:text-white bg-black/30 hover:bg-black/50 rounded-full"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
