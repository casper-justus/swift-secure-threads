
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Clapperboard, Search, Loader2 } from "lucide-react"; // Changed Image to Clapperboard
import { useToast } from "@/hooks/use-toast";

// Giphy API Key - Replace with environment variable in a real app
const GIPHY_API_KEY = "9AdikWOSTvyCMeWpP0XC0syZ0G555vGv";

interface GifPickerProps {
  onGifSelect: (gifUrl: string, gifData?: any) => void; // Added gifData for potential future use
}

interface GiphyGif {
  id: string;
  url: string; // The direct URL to the GIF page on Giphy
  images: {
    fixed_height_small: { // Or other renditions like original, downsized, etc.
      url: string;
      width: string;
      height: string;
    };
    original: {
        url: string;
        width: string;
        height: string;
    }
    // Add other renditions as needed
  };
  title: string;
}

// Debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};


export const GifPicker = ({ onGifSelect }: GifPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchGifs = async (term: string) => {
    setLoading(true);
    setError(null);
    setGifs([]); // Clear previous results

    try {
      const endpoint = term
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(term)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Giphy API error: ${response.status}`);
      }
      const data = await response.json();
      setGifs(data.data || []);
      if (data.data.length === 0 && term) {
        setError(`No GIFs found for "${term}".`);
      }
    } catch (err: any) {
      console.error("Failed to fetch GIFs:", err);
      setError(err.message || "Failed to fetch GIFs. Check console for details.");
      toast({
        title: "Error fetching GIFs",
        description: err.message || "Could not load GIFs from Giphy.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced version of fetchGifs for search term changes
  const debouncedFetchGifs = useCallback(debounce(fetchGifs, 500), []);

  useEffect(() => {
    if (isOpen) {
      if (searchTerm) {
        debouncedFetchGifs(searchTerm);
      } else {
        fetchGifs(""); // Fetch trending if search term is empty
      }
    }
  }, [searchTerm, isOpen, debouncedFetchGifs]);


  const handleGifClick = (gif: GiphyGif) => {
    // Prefer a specific rendition, e.g., original or a fixed height version
    const selectedGifUrl = gif.images.original.url || gif.images.fixed_height_small.url;
    onGifSelect(selectedGifUrl, gif); // Pass the whole gif object if needed later
    setIsOpen(false);
    setSearchTerm(""); // Reset search term
    setGifs([]); // Clear GIFs to show trending next time
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) { // Reset when closing
        setSearchTerm("");
        setGifs([]);
        setError(null);
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] p-2"
          onClick={() => !isOpen && fetchGifs("")} // Fetch trending when opening if not already open
        >
          <Clapperboard className="h-5 w-5" /> {/* Changed Image to Clapperboard */}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 bg-[#36393f] border-[#202225]" side="top">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#72767d]" />
            <Input
              placeholder="Search Giphy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#40444b] border-[#202225] text-white placeholder:text-[#72767d]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-60 min-h-[100px] overflow-y-auto relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#36393f]/50">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
            {!loading && error && (
              <div className="col-span-2 text-center text-sm text-red-400 py-4">{error}</div>
            )}
            {!loading && !error && gifs.length === 0 && searchTerm && (
                 <div className="col-span-2 text-center text-sm text-gray-400 py-4">No GIFs found for "{searchTerm}".</div>
            )}
            {!loading && !error && gifs.length === 0 && !searchTerm && (
                 <div className="col-span-2 text-center text-sm text-gray-400 py-4">Loading trending GIFs or no trending GIFs found.</div>
            )}
            {!loading && !error && gifs.map((gif) => (
              <Button
                key={gif.id}
                variant="ghost"
                className="p-0.5 h-24 w-full hover:bg-[#4f545c] border border-transparent hover:border-purple-500"
                onClick={() => handleGifClick(gif)}
              >
                <img
                  src={gif.images.fixed_height_small.url}
                  alt={gif.title || `GIF ${gif.id}`}
                  className="w-full h-full object-cover rounded-sm"
                  loading="lazy"
                />
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
