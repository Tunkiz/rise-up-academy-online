import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      console.log('Sending password reset from forgot password page:', {
        email,
        redirectUrl,
        isDevelopment,
        hostname: window.location.hostname,
        port: window.location.port
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Password reset email sent successfully from forgot password page');
        setSent(true);
        toast({
          title: "Password reset email sent",
          description: "Please check your email for password reset instructions.",
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We've sent a password reset link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>
              Didn't receive the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="text-primary underline hover:no-underline"
              >
                try again
              </button>
            </p>
          </CardContent>
          <CardFooter>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleForgotPassword}>
          <CardHeader>
            <CardTitle className="text-2xl">Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" type="submit" disabled={loading || !email}>
              {loading ? "Sending..." : "Send reset email"}
            </Button>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ForgotPassword;
