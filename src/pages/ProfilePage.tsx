
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
});

const ProfilePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Ignore 'PGRST116' (no rows found)
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!user,
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name || user?.user_metadata.full_name || "",
    },
    // Reset form when profile data loads
    ...(profile && {values: { full_name: profile.full_name || "" }}),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileSchema>) => {
      if (!user) throw new Error("User not authenticated");

      // Update auth user metadata
      const { data: { user: updatedUser }, error: userError } = await supabase.auth.updateUser({
        data: { full_name: values.full_name }
      });
      if (userError) throw userError;

      // Update public profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: values.full_name })
        .eq('id', user.id);
      if (profileError) throw profileError;

      return updatedUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      // onAuthStateChange will update user in AuthProvider, which will cause dashboard to re-render with new name.
      toast.success("Profile updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    }
  });

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(values);
  };

  return (
    <div className="container py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User />
            User Profile
          </CardTitle>
          <CardDescription>Manage your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-24" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
