
import { Button } from "@/components/ui/button";
import { Download, File, Image, Video, Volume2 } from "lucide-react";

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
}

interface FileAttachmentProps {
  message: Message;
}

export const FileAttachment = ({ message }: FileAttachmentProps) => {
  if (!message.file_url) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-4 w-4" />;
    
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (fileType.startsWith('audio/')) return <Volume2 className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const isImage = message.file_type?.startsWith('image/');
  const isVideo = message.file_type?.startsWith('video/');
  const isAudio = message.file_type?.startsWith('audio/');

  return (
    <div className="mt-2 max-w-sm">
      {isImage && (
        <img
          src={message.file_url}
          alt={message.file_name}
          className="rounded-lg max-w-full h-auto cursor-pointer"
          onClick={() => window.open(message.file_url, '_blank')}
        />
      )}
      
      {isVideo && (
        <video
          src={message.file_url}
          controls
          className="rounded-lg max-w-full h-auto"
        />
      )}
      
      {isAudio && (
        <audio
          src={message.file_url}
          controls
          className="max-w-full"
        />
      )}
      
      {!isImage && !isVideo && !isAudio && (
        <div className="bg-[#2f3136] rounded-lg p-3 flex items-center gap-3 border border-[#202225]">
          {getFileIcon(message.file_type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {message.file_name}
            </p>
            {message.file_size && (
              <p className="text-xs text-[#b9bbbe]">
                {formatFileSize(message.file_size)}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(message.file_url, '_blank')}
            className="text-[#5865f2] hover:text-[#4752c4] hover:bg-[#5865f2]/10"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
