import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, UserPlus } from "lucide-react";

interface AddTeacherTutorProps {
  onSuccess?: () => void;
}

const AddTeacherTutor = ({ onSuccess }: AddTeacherTutorProps) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<'teacher' | 'tutor'>('teacher');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async ({ email, fullName, role }: { email: string; fullName: string; role: 'teacher' | 'tutor' }) => {
      // Call the Edge Function to create the user
      const { data, error } = await supabase.functions.invoke('create-teacher-tutor', {
        body: {
          email,
          fullName,
          role,
        },
      });

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      return data;
    },
    onSuccess: (data) => {
      const message = data.email_sent 
        ? `${fullName} has been created successfully. An email with login details has been sent.`
        : `${fullName} has been created successfully. Temporary password: ${data.temporary_password}`;
      
      toast({
        title: "Success",
        description: message,
      });
      
      // Reset form
      setEmail("");
      setFullName("");
      setRole('teacher');
      
      // Refresh user list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !fullName || !role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createUserMutation.mutateAsync({ email, fullName, role });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add {role === 'teacher' ? 'Teacher' : 'Tutor'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={(value: 'teacher' | 'tutor') => setRole(value)} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="tutor">Tutor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={isSubmitting || !email || !fullName} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating {role}...
                </>
              ) : (
                <>Add {role === 'teacher' ? 'Teacher' : 'Tutor'}</>
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>• A temporary password will be generated automatically</p>
            <p>• Login details will be sent to the provided email</p>
            <p>• The user will be prompted to change their password on first login</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddTeacherTutor;
