
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
import AvatarUpload from "@/components/profile/AvatarUpload";
import React from "react";
import SubjectSelector from "@/components/profile/SubjectSelector";
import { Separator } from "@/components/ui/separator";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  grade: z.coerce.number().min(1, "Grade must be between 1 and 12").max(12).optional().nullable(),
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
        .select('full_name, avatar_url, grade')
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
    defaultValues: {
      full_name: user?.user_metadata.full_name || "",
      grade: null,
    },
  });
  
  React.useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        grade: profile.grade || null,
      });
    }
  }, [profile, form.reset]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileSchema>) => {
      if (!user) throw new Error("User not authenticated");

      // Update auth user metadata
      const { data: { user: updatedUser }, error: userError } = await supabase.auth.updateUser({
        data: { 
          full_name: values.full_name,
          grade: values.grade,
         }
      });
      if (userError) throw userError;

      // Update public profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: values.full_name,
          grade: values.grade
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      return updatedUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-details', user?.id] });
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
          <CardDescription>Manage your personal information and avatar.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex justify-center">
                  <Skeleton className="h-32 w-32 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full mt-4" />
              <Skeleton className="h-10 w-24 self-start" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <AvatarUpload 
                initialUrl={profile?.avatar_url}
                fullName={profile?.full_name || user?.user_metadata?.full_name}
              />
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
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
                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade Level</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g., 10" 
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                          />
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

              <Separator className="my-4" />
              
              <div className="w-full">
                <SubjectSelector />
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
