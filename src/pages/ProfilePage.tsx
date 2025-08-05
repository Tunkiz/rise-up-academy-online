import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AvatarUpload from "@/components/profile/AvatarUpload";
import React from "react";
import SubjectSelector from "@/components/profile/SubjectSelector";
import PaymentProofUpload from "@/components/profile/PaymentProofUpload";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  grade: z.coerce.number().min(1, "Grade must be between 1 and 12").optional().nullable(),
});

const ProfilePage = () => {
  const { user } = useAuth();

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

  // Get user's enrolled subjects with their categories
  const { data: userSubjectsWithCategories } = useQuery({
    queryKey: ['user-subjects-with-categories', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_subjects')
        .select(`
          subjects (
            id,
            name
          )
        `)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching user subjects:', error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  // Get subject categories
  const { data: subjectCategories } = useQuery({
    queryKey: ['subject-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subject_categories').select('*');
      if (error) throw error;
      return data;
    },
  });

  const enrolledCategories = React.useMemo(() => {
    if (!userSubjectsWithCategories || !subjectCategories) return [];
    const categories = new Set<string>();
    userSubjectsWithCategories.forEach(us => {
      if (us.subjects) {
        const subjectCats = subjectCategories
          .filter(sc => sc.subject_id === us.subjects.id)
          .map(sc => sc.category);
        subjectCats.forEach(cat => categories.add(cat));
      }
    });
    return Array.from(categories);
  }, [userSubjectsWithCategories, subjectCategories]);

  const categoryDisplayNames: Record<string, string> = {
    matric_amended: 'Matric Amended',
    national_senior: 'National Senior Certificate',
    senior_phase: 'Senior Phase'
  };

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      grade: null,
    },
  });
  
  React.useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || user?.user_metadata.full_name || "",
        grade: profile.grade || null,
      });
    } else if (user) {
       form.reset({
        full_name: user.user_metadata.full_name || "",
        grade: null,
      });
    }
  }, [profile, user, form]);

  return (
    <div className="container py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User />
            User Profile
          </CardTitle>
          <CardDescription>Manage your personal information and subject enrollments.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex justify-center">
                  <Skeleton className="h-32 w-32 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <AvatarUpload 
                initialUrl={profile?.avatar_url}
                fullName={profile?.full_name || user?.user_metadata?.full_name}
              />
              <Form {...form}>
                <form className="space-y-4 w-full">
                   <p className="text-sm text-muted-foreground text-center p-3 bg-muted/50 rounded-lg">
                    Your personal details can only be changed by an administrator. Please contact support if you need to update them.
                  </p>
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} readOnly className="bg-muted/50" />
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
                            placeholder="Not set" 
                            {...field}
                            value={field.value ?? ""}
                            readOnly
                            className="bg-muted/50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              <Separator className="my-4" />
              
              <Tabs defaultValue="subjects" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="subjects">My Subjects</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="subjects" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">My Subjects</h3>
                    <p className="text-sm text-muted-foreground mb-4">Select the subjects you are studying to personalize your learning experience.</p>
                    
                    {enrolledCategories.length > 0 && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <h4 className="text-sm font-medium mb-2">Enrolled Categories:</h4>
                        <div className="flex flex-wrap gap-2">
                          {enrolledCategories.map(category => (
                            <Badge key={category} variant="outline">
                              {categoryDisplayNames[category] || category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <SubjectSelector />
                  </div>
                </TabsContent>
                
                <TabsContent value="payments" className="space-y-4">
                  <PaymentProofUpload />
                </TabsContent>
              </Tabs>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
