import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface User {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface ResetPasswordDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const ResetPasswordDialog = ({
  user,
  isOpen,
  onOpenChange,
}: ResetPasswordDialogProps) => {
  const [isResetting, setIsResetting] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      // Determine the correct redirect URL based on environment
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let redirectUrl;
      
      if (isDevelopment) {
        // For development, try to detect the actual port being used
        const currentPort = window.location.port || '8081';
        redirectUrl = `http://localhost:${currentPort}/reset-password`;
      } else {
        redirectUrl = `${window.location.origin}/reset-password`;
      }
      
      console.log('Environment:', { isDevelopment, hostname: window.location.hostname, port: window.location.port });
      console.log('Sending password reset to:', user.email, 'with redirect:', redirectUrl);
      console.log('Current origin:', window.location.origin);
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset error:', error);
        throw new Error(error.message);
      }
      
      console.log('Password reset email sent successfully');
    },
    onSuccess: () => {
      toast({
        title: "Password reset email sent",
        description: `A password reset email has been sent to ${user?.email}`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = async () => {
    setIsResetting(true);
    try {
      await resetPasswordMutation.mutateAsync();
    } finally {
      setIsResetting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            This will send a password reset email to the user.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              A password reset email will be sent to <strong>{user.email}</strong>. 
              The user will need to check their email and follow the instructions to set a new password.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="font-medium text-sm mb-2">User Details:</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Name:</span> {user.full_name || 'N/A'}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Role:</span> {user.role}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleResetPassword}
            disabled={isResetting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Email...
              </>
            ) : (
              "Send Reset Email"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
