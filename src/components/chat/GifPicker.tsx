
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Image, Search } from "lucide-react";

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

// Mock GIF data - in a real app, you'd integrate with Giphy API
const mockGifs = [
  "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
  "https://media.giphy.com/media/26gR0YFZxWbnUPtMA/giphy.gif",
  "https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif",
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  "https://media.giphy.com/media/26n6Gx9moCgs1pUuk/giphy.gif",
  "https://media.giphy.com/media/3o6Zt0hNCfak3QCqsw/giphy.gif"
];

export const GifPicker = ({ onGifSelect }: GifPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleGifClick = (gifUrl: string) => {
    onGifSelect(gifUrl);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] p-2"
        >
          <Image className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 bg-[#36393f] border-[#202225]" side="top">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#72767d]" />
            <Input
              placeholder="Search GIFs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#40444b] border-[#202225] text-white placeholder:text-[#72767d]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {mockGifs.map((gif, index) => (
              <Button
                key={index}
                variant="ghost"
                className="p-1 h-20 w-full hover:bg-[#4f545c]"
                onClick={() => handleGifClick(gif)}
              >
                <img
                  src={gif}
                  alt={`GIF ${index + 1}`}
                  className="w-full h-full object-cover rounded"
                />
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
