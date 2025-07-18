import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, UserPlus, Copy } from "lucide-react";

interface AddTeacherTutorProps {
  onSuccess?: () => void;
}

const AddTeacherTutor = ({ onSuccess }: AddTeacherTutorProps) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<'teacher' | 'tutor'>('teacher');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedUser, setLastCreatedUser] = useState<{
    email: string;
    fullName: string;
    role: string;
    temporaryPassword: string;
    emailSent: boolean;
  } | null>(null);
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
      // Store the last created user info for manual sharing if needed
      setLastCreatedUser({
        email: email,
        fullName: fullName,
        role: role,
        temporaryPassword: data.temporary_password || '', // May be null if using password reset flow
        emailSent: data.email_sent
      });

      // Construct message based on email status and method
      let message = `${fullName} has been created successfully.`
      
      if (data.email_sent) {
        if (data.use_password_reset) {
          message += ` A password reset email has been sent to ${email}. They should check their email and follow the link to set up their password.`
        } else {
          message += ` An email with login details has been sent to ${email}.`
        }
      } else if (data.email_error) {
        message += ` However, the email could not be sent: ${data.email_error}.`
        if (data.temporary_password) {
          message += ` Please share the login details manually.`
        } else {
          message += ` Please send them a password reset link manually.`
        }
      } else {
        message += ` Email service is not configured.`
        if (data.temporary_password) {
          message += ` Please share the login details manually.`
        } else {
          message += ` Please send them a password reset link manually.`
        }
      }
      
      toast({
        title: "Success",
        description: message,
        duration: data.email_sent ? 5000 : 10000, // Longer duration if manual sharing needed
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

  const copyLoginDetails = async () => {
    if (!lastCreatedUser) return;
    
    let loginDetails;
    
    if (lastCreatedUser.temporaryPassword) {
      // Traditional temporary password method
      loginDetails = `
Rise Up Academy Online - ${lastCreatedUser.role === 'teacher' ? 'Teacher' : 'Tutor'} Login Details

Name: ${lastCreatedUser.fullName}
Email: ${lastCreatedUser.email}
Temporary Password: ${lastCreatedUser.temporaryPassword}
Login URL: ${window.location.origin}/login

Important: Please change your password immediately after your first login.
      `.trim();
    } else {
      // Password reset method
      loginDetails = `
Rise Up Academy Online - ${lastCreatedUser.role === 'teacher' ? 'Teacher' : 'Tutor'} Account Created

Name: ${lastCreatedUser.fullName}
Email: ${lastCreatedUser.email}
Login URL: ${window.location.origin}/login

A password reset email has been sent to the above email address. Please check your email and follow the link to set up your password.

If you don't receive the email, you can request a new password reset at: ${window.location.origin}/forgot-password
      `.trim();
    }

    try {
      await navigator.clipboard.writeText(loginDetails);
      toast({
        title: "Copied to Clipboard",
        description: "Login details have been copied to your clipboard.",
      });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please copy the details manually.",
        variant: "destructive",
      });
    }
  };

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

          <div className="pt-4 space-y-3">
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

            {lastCreatedUser && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={copyLoginDetails}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy {lastCreatedUser.temporaryPassword ? 'Login Details' : 'Account Info'} for {lastCreatedUser.fullName}
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p>• A temporary password will be generated automatically</p>
            <p>• Login details will be sent to the provided email (if configured)</p>
            <p>• The user will be prompted to change their password on first login</p>
            {lastCreatedUser && !lastCreatedUser.emailSent && (
              <p className="text-orange-600 font-medium mt-2">
                ⚠️ Email not sent - use "Copy Login Details" button to share credentials manually
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddTeacherTutor;
