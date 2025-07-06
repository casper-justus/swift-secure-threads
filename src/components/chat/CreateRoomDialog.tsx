
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomCreated: () => void;
  userId: string;
}

export const CreateRoomDialog = ({ open, onOpenChange, onRoomCreated, userId }: CreateRoomDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Creating room with userId:", userId);
      
      // Create the room
      const { data: room, error: roomError } = await supabase
        .from("chat_rooms")
        .insert({
          name,
          description: description || null,
          created_by: userId,
          is_private: isPrivate,
        })
        .select()
        .single();

      if (roomError) {
        console.error("Room creation error:", roomError);
        throw roomError;
      }

      console.log("Room created successfully:", room);

      // Add the creator as a member
      const { error: memberError } = await supabase
        .from("room_members")
        .insert({
          room_id: room.id,
          user_id: userId,
          role: "admin",
        });

      if (memberError) {
        console.error("Member addition error:", memberError);
        throw memberError;
      }

      toast({
        title: "Room created",
        description: `Successfully created "${name}"`,
      });

      setName("");
      setDescription("");
      setIsPrivate(true);
      onOpenChange(false);
      onRoomCreated();
    } catch (error: any) {
      console.error("Full error object:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create room",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#36393f] border-[#202225]">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Room</DialogTitle>
          <DialogDescription className="text-[#b9bbbe]">
            Create a private encrypted room for secure conversations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">Room Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter room name"
              required
              className="bg-[#40444b] border-[#202225] text-white placeholder:text-[#72767d] focus:border-[#5865f2]"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-white">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the room"
              className="bg-[#40444b] border-[#202225] text-white placeholder:text-[#72767d] focus:border-[#5865f2]"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
            <Label htmlFor="private" className="text-white">Private room</Label>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-[#202225] text-white hover:bg-[#4f545c] bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              {loading ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
