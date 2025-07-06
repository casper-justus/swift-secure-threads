
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Edit, Save, X } from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface UserProfileProps {
  session: Session;
}

export const UserProfile = ({ session }: UserProfileProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, [session.user.id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          name: data.name || "",
          username: data.username || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error fetching profile",
        description: error.message || "Failed to fetch profile data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          name: formData.name,
          username: formData.username,
          email: session.user.email,
        });

      if (error) throw error;

      await fetchProfile();
      setEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", session.user.id);

      if (updateError) throw updateError;

      await fetchProfile();
      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading avatar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#36393f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865f2]"></div>
      </div>
    );
  }

  const displayName = profile?.name || profile?.username || session.user.email?.split('@')[0] || "User";
  const displayEmail = session.user.email || "No email provided";

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-[#36393f] text-white min-h-full">
      {/* Discord-style profile header */}
      <div className="flex items-center p-4 rounded-lg mb-6 bg-[#2f3136] border border-[#202225]">
        <div className="relative mr-4">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
            <AvatarImage src={profile?.avatar_url || ""} alt={displayName} />
            <AvatarFallback className="text-2xl bg-[#5865f2] text-white">
              {displayName?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload-google"
            className="absolute bottom-0 right-0 bg-[#5865f2] hover:bg-[#4752c4] text-white p-2 rounded-full cursor-pointer transition-colors shadow-md"
            title="Change profile picture"
          >
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            <input
              id="avatar-upload-google"
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex-grow">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">
            {displayName}
          </h1>
          <p className="text-sm sm:text-base text-[#b9bbbe]">
            {displayEmail}
          </p>
        </div>
      </div>

      <Card className="bg-[#2f3136] border-[#202225] shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl text-white">
            Profile Details
          </CardTitle>
          <CardDescription className="text-[#b9bbbe]">
            Manage your account settings and set e-mail preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-[#b9bbbe] mb-1">
                  Display Name
                </label>
                <Input
                  id="displayName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your display name"
                  className="bg-[#40444b] border-[#202225] text-white placeholder:text-[#72767d] focus:border-[#5865f2]"
                />
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#b9bbbe] mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter your username"
                  className="bg-[#40444b] border-[#202225] text-white placeholder:text-[#72767d] focus:border-[#5865f2]"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={updateProfile}
                  disabled={loading || uploading}
                  className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    setEditing(false);
                    if (profile) {
                      setFormData({ name: profile.name || "", username: profile.username || "" });
                    }
                  }}
                  variant="outline"
                  className="flex-1 border-[#202225] text-white hover:bg-[#4f545c] bg-transparent"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-[#b9bbbe] mb-1">
                  Display Name
                </h3>
                <p className="text-base text-white">{profile?.name || <span className="italic text-[#72767d]">Not set</span>}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#b9bbbe] mb-1">
                  Username
                </h3>
                <p className="text-base text-white">{profile?.username || <span className="italic text-[#72767d]">Not set</span>}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#b9bbbe] mb-1">
                  Email
                </h3>
                <p className="text-base text-white">{displayEmail}</p>
              </div>
              <Button
                onClick={() => setEditing(true)}
                className="w-full sm:w-auto bg-[#5865f2] hover:bg-[#4752c4] text-white mt-4"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
