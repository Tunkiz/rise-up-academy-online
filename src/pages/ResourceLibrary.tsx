
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthProvider";

type Resource = Tables<'resources'> & { subjects: { name: string } | null };

const ResourceLibrary = () => {
  const { user, isAdmin } = useAuth();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('grade')
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const { data: resources, isLoading: isLoadingResources } = useQuery({
    queryKey: ['resources', user ? profile?.grade : 'public'],
    queryFn: async (): Promise<Resource[]> => {
      let query = supabase.from('resources').select('*, subjects(name)');
      
      if (user && profile) {
        if (profile.grade) {
          query = query.or(`grade.eq.${profile.grade},grade.is.null`);
        } else {
          query = query.is('grade', null);
        }
      } else {
        query = query.is('grade', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as Resource[] || [];
    },
    enabled: !user || (!!user && !isLoadingProfile),
  });

  const isLoading = isLoadingProfile || isLoadingResources;

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold">Resource Library</h1>
          <p className="text-muted-foreground mt-2">Find all your study materials here.</p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      )}

      {!isLoading && resources && resources.length > 0 && (
        <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
          {resources.map(resource => (
            <Card key={resource.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{resource.title}</CardTitle>
                <CardDescription>{resource.subjects?.name || 'General'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3 h-[60px]">
                  {resource.description || "No description provided."}
                </p>
                <Button asChild className="w-full mt-auto">
                  <a href={resource.file_url || '#'} target="_blank" rel="noopener noreferrer" download>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (!resources || resources.length === 0) && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg mt-8">
          <h2 className="text-2xl font-semibold">No Resources Found</h2>
          <p className="text-muted-foreground mt-2">
            It looks like there are no resources available yet.
            {isAdmin ? " You can add some in the admin panel." : " Please check back later."}
          </p>
        </div>
      )}
    </div>
  );
};
export default ResourceLibrary;
