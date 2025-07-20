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
import { getPasswordResetRedirectUrl, logEnvironmentInfo } from '@/lib/auth-utils';

interface AddTeacherTutorProps {
  onSuccess?: () => void;
}

const AddTeacherTutor = ({ onSuccess }: AddTeacherTutorProps) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<'teacher' | 'tutor'>('teacher');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForEmail, setWaitingForEmail] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async ({ email, fullName, role }: { email: string; fullName: string; role: 'teacher' | 'tutor' }) => {
      console.log('Creating teacher/tutor using direct approach...');
      
      // Get the correct redirect URL (same as password reset)
      const redirectUrl = getPasswordResetRedirectUrl();
      logEnvironmentInfo();
      
      // Step 1: Create user with auth.admin (requires service role key)
      // For now, let's use the Edge Function for user creation but improve the email flow
      const { data: userData, error: createError } = await supabase.functions.invoke('create-teacher-tutor', {
        body: {
          email,
          fullName,
          role,
        },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!userData.success) {
        throw new Error(userData.error || 'Failed to create user');
      }

      // Step 2: Wait 61 seconds before sending onboarding email to avoid rate limit
      console.log('Waiting 61 seconds before sending onboarding email to avoid rate limit...');
      setWaitingForEmail(true);
      setCountdown(61);
      
      // Countdown timer
      for (let i = 61; i > 0; i--) {
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
      
      setWaitingForEmail(false);
      setCountdown(0);

      // Step 3: Send password reset email (same approach as ForgotPassword)
      console.log('Sending onboarding email using password reset approach...', {
        email,
        redirectUrl
      });

      const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (emailError) {
        console.warn('Email sending failed:', emailError);
        // Don't throw error, just log it - user was created successfully
        return {
          ...userData,
          email_sent: false,
          email_error: emailError.message,
        };
      }

      console.log('Onboarding email sent successfully');
      return {
        ...userData,
        email_sent: true,
        email_error: null,
      };
    },
    onSuccess: (data) => {
      console.log('Teacher/Tutor creation response:', data);
      
      let toastTitle = "Teacher/Tutor Created Successfully";
      let toastDescription = "";
      
      if (data.email_sent) {
        toastDescription = `${fullName} has been created and an onboarding email has been sent to ${email}. They will receive instructions to set up their password.`;
      } else if (data.email_error) {
        toastTitle = "User Created (Email Issue)";
        toastDescription = `${fullName} has been created successfully, but the onboarding email could not be sent (${data.email_error}). Please manually share the login instructions.`;
        if (data.temporary_password) {
          toastDescription += ` Temporary password: ${data.temporary_password}`;
        }
      } else {
        toastDescription = `${fullName} has been created successfully.`;
        if (data.temporary_password) {
          toastDescription += ` Temporary password: ${data.temporary_password}`;
        }
      }
      
      toast({
        title: toastTitle,
        description: toastDescription,
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

          {waitingForEmail && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  <strong>Please wait:</strong> Sending onboarding email in {countdown} seconds...
                </div>
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              </div>
              <div className="mt-2 text-xs text-blue-600">
                Supabase requires a 60-second delay between password reset emails for security.
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button type="submit" disabled={isSubmitting || !email || !fullName} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {waitingForEmail ? (
                    `Waiting to send email... ${countdown}s`
                  ) : (
                    `Creating ${role}...`
                  )}
                </>
              ) : (
                <>Add {role === 'teacher' ? 'Teacher' : 'Tutor'}</>
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>• A temporary account will be created automatically</p>
            <p>• An email with setup instructions will be sent</p>
            <p>• The user will need to set their password via email link</p>
            <p>• There's a 60-second delay before sending the email (Supabase rate limit)</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddTeacherTutor;
