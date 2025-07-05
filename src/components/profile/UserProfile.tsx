
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Edit, Save, X, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom"; // Assuming you are using react-router-dom

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
  const navigate = useNavigate();

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
          email: session.user.email, // Ensure email is included if it can be updated, otherwise remove
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
      const filePath = `${session.user.id}/${Date.now()}.${fileExt}`; // Add timestamp to avoid caching issues

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

      await fetchProfile(); // Refetch profile to update avatar_url state
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

  const handleProfileClick = () => {
    // Since this IS the profile page, clicking this might not navigate elsewhere,
    // but if it were part of a header component, it would navigate to this page.
    // For now, let's assume it's a visual cue or could be used for other actions.
    // If this component is used in a layout header, then: navigate('/profile');
    console.log("Profile section clicked");
  };

  if (loading && !profile) { // Show loader only if profile is not yet loaded
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayName = profile?.name || profile?.username || session.user.email?.split('@')[0] || "User";
  const displayEmail = session.user.email || "No email provided";

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-background text-foreground">
      {/* Google-like clickable profile header */}
      <div
        className="flex items-center p-4 rounded-lg mb-6 cursor-pointer hover:bg-card-hover transition-colors duration-150 ease-in-out"
        onClick={handleProfileClick} // This component is already the profile page.
      >
        <div className="relative mr-4">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
            <AvatarImage src={profile?.avatar_url || ""} alt={displayName} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {displayName?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload-google"
            className="absolute bottom-0 right-0 bg-accent hover:bg-accent/90 text-accent-foreground p-2 rounded-full cursor-pointer transition-colors shadow-md"
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
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            {displayName}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {displayEmail}
          </p>
        </div>
        {/* <ChevronRight className="h-6 w-6 text-muted-foreground" /> */}
      </div>

      <Card className="bg-card border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl text-foreground">
            Profile Details
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your account settings and set e-mail preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-muted-foreground mb-1">
                  Display Name
                </label>
                <Input
                  id="displayName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your display name"
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-muted-foreground mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter your username"
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={updateProfile}
                  disabled={loading || uploading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    setEditing(false);
                    // Reset form data if changes are cancelled
                    if (profile) {
                      setFormData({ name: profile.name || "", username: profile.username || "" });
                    }
                  }}
                  variant="outline"
                  className="flex-1 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Display Name
                </h3>
                <p className="text-base text-foreground">{profile?.name || <span className="italic text-muted-foreground">Not set</span>}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Username
                </h3>
                <p className="text-base text-foreground">{profile?.username || <span className="italic text-muted-foreground">Not set</span>}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Email
                </h3>
                <p className="text-base text-foreground">{displayEmail}</p>
              </div>
              <Button
                onClick={() => setEditing(true)}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
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
