import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const EmailTest = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testPasswordReset = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset test error:', error);
        toast({
          title: "Error",
          description: `Password reset failed: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('Password reset test successful');
        toast({
          title: "Success",
          description: "Password reset email sent successfully (if email exists in system)",
        });
      }
    } catch (err) {
      console.error('Password reset exception:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testEdgeFunction = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-teacher-tutor', {
        body: {
          email: email,
          fullName: "Test Teacher",
          role: 'teacher',
        },
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        toast({
          title: "Error",
          description: `Edge function failed: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Edge function response: ${JSON.stringify(data)}`,
        });
      }
    } catch (err) {
      console.error('Edge function exception:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Email Test</CardTitle>
          <CardDescription>
            Test email functionality for debugging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="test@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          
          <div className="space-y-2">
            <Button 
              className="w-full" 
              onClick={testPasswordReset} 
              disabled={loading || !email}
            >
              {loading ? "Testing..." : "Test Password Reset Email"}
            </Button>
            
            <Button 
              className="w-full" 
              variant="outline"
              onClick={testEdgeFunction} 
              disabled={loading || !email}
            >
              {loading ? "Testing..." : "Test Teacher Creation"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTest;
