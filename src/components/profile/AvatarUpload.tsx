import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AvatarUploadProps {
  initialUrl: string | null | undefined;
  fullName: string | null | undefined;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ initialUrl, fullName }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const updateProfileAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
        if (!user) throw new Error("User not authenticated");
  
        // Update public profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);
        if (profileError) throw profileError;

        // Also update auth user metadata to keep it in sync
        const { data: { user: updatedUser }, error: userError } = await supabase.auth.updateUser({
            data: { avatar_url: avatarUrl }
        });
        if (userError) throw userError;
  
        return updatedUser;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['user-details', user?.id]});
        toast.success("Avatar updated successfully!");
      },
      onError: (error: Error) => {
        toast.error(`Failed to update avatar: ${error.message}`);
      },
      onSettled: () => {
        setUploading(false);
      }
  });

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast.error('You must be logged in to upload an avatar.');
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) { // 2MB limit
        toast.error("File is too large. Please select an image under 2MB.");
        return;
    }

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${new Date().getTime()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      if (publicUrl) {
        updateProfileAvatarMutation.mutate(publicUrl);
      } else {
        throw new Error("Could not get public URL for uploaded avatar.")
      }

    } catch (error) {
      toast.error((error as Error).message);
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-32 w-32 border-2 border-border">
          <AvatarImage src={initialUrl || ''} alt={fullName || 'User Avatar'} />
          <AvatarFallback className="text-4xl">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        <div 
          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center rounded-full transition-opacity cursor-pointer" 
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          aria-label="Upload new avatar"
        >
          {!uploading && <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/png, image/jpeg"
            className="hidden"
            disabled={uploading}
        />
      </div>
      {uploading && (
          <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Uploading...</span>
          </div>
      )}
    </div>
  );
};

export default AvatarUpload;
