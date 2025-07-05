
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Upload, X } from "lucide-react";

interface FileUploadProps {
  onFileUploaded: (fileUrl: string, fileName: string, fileType: string, fileSize: number) => void;
}

export const FileUpload = ({ onFileUploaded }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Check file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 100MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `chat-files/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      onFileUploaded(
        data.publicUrl,
        selectedFile.name,
        selectedFile.type,
        selectedFile.size
      );

      setSelectedFile(null);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="flex items-center gap-2">
      {selectedFile ? (
        <div className="flex items-center gap-2 bg-white/10 rounded px-3 py-2 flex-1">
          <Paperclip className="h-4 w-4 text-purple-400" />
          <span className="text-sm text-white truncate">{selectedFile.name}</span>
          <div className="flex gap-1 ml-auto">
            <Button
              size="sm"
              onClick={uploadFile}
              disabled={uploading}
              className="bg-purple-600 hover:bg-purple-700 h-6 px-2"
            >
              <Upload className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFile}
              className="h-6 px-2 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-white/5"
            asChild
          >
            <span>
              <Paperclip className="h-4 w-4" />
            </span>
          </Button>
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
        </label>
      )}
    </div>
  );
};
