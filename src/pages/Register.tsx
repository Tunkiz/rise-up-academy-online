
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Register = () => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [grade, setGrade] = useState("");
    const [learnerCategory, setLearnerCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const { toast } = useToast();
    const navigate = useNavigate();

    // Validate passwords match
    const validatePasswords = () => {
        if (password && confirmPassword && password !== confirmPassword) {
            setPasswordError("Passwords do not match");
            return false;
        } else {
            setPasswordError("");
            return true;
        }
    };

    // Check password requirements
    const validatePasswordStrength = (pwd: string) => {
        if (pwd.length < 8) {
            return "Password must be at least 8 characters long";
        }
        if (!/(?=.*[a-z])/.test(pwd)) {
            return "Password must contain at least one lowercase letter";
        }
        if (!/(?=.*[A-Z])/.test(pwd)) {
            return "Password must contain at least one uppercase letter";
        }
        if (!/(?=.*\d)/.test(pwd)) {
            return "Password must contain at least one number";
        }
        return "";
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // Validate password strength
        const strengthError = validatePasswordStrength(password);
        if (strengthError) {
            setPasswordError(strengthError);
            setLoading(false);
            return;
        }

        // Validate passwords match
        if (!validatePasswords()) {
            setLoading(false);
            return;
        }
        
        console.log("Registration attempt with:", { fullName, email, grade, learnerCategory });
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        grade: grade || 'not_applicable',
                        learner_category: learnerCategory || 'national_senior',
                    },
                    emailRedirectTo: `${window.location.origin}/dashboard`
                },
            });
            
            console.log("Registration response:", { data, error });
            
            if (error) {
                console.error("Registration error:", error);
                toast({
                    title: "Error signing up",
                    description: error.message,
                    variant: "destructive",
                });
            } else if (data.user) {
                console.log("User created successfully:", data.user.id);
                toast({
                    title: "Success!",
                    description: "Account created successfully. Please check your email for verification.",
                });
                navigate("/login");
            }
        } catch (error: unknown) {
            console.error("Unexpected registration error:", error);
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
            toast({
                title: "Error signing up",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm">
                <form onSubmit={handleRegister}>
                    <CardHeader>
                        <CardTitle className="text-2xl">Sign Up</CardTitle>
                        <CardDescription>
                            Create your account to get started.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="full-name">Full Name</Label>
                            <Input 
                                id="full-name" 
                                placeholder="John Doe" 
                                required 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)} 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="m@example.com" 
                                required 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                required 
                                value={password} 
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (confirmPassword) {
                                        validatePasswords();
                                    }
                                }} 
                            />
                            {password && validatePasswordStrength(password) && (
                                <p className="text-xs text-red-500">
                                    {validatePasswordStrength(password)}
                                </p>
                            )}
                            {!password && (
                                <div className="text-xs text-muted-foreground">
                                    <p>Password requirements:</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>At least 8 characters</li>
                                        <li>One uppercase letter</li>
                                        <li>One lowercase letter</li>
                                        <li>One number</li>
                                    </ul>
                                </div>
                            )}
                            {password && !validatePasswordStrength(password) && (
                                <p className="text-xs text-green-600">
                                    ✓ Password meets requirements
                                </p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input 
                                id="confirm-password" 
                                type="password" 
                                required 
                                value={confirmPassword} 
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setTimeout(validatePasswords, 100);
                                }} 
                            />
                            {passwordError && (
                                <p className="text-xs text-red-500">
                                    {passwordError}
                                </p>
                            )}
                            {confirmPassword && password && !passwordError && (
                                <p className="text-xs text-green-600">
                                    ✓ Passwords match
                                </p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="learner-category">Learning Level</Label>
                            <Select onValueChange={setLearnerCategory} value={learnerCategory} required>
                                <SelectTrigger id="learner-category">
                                    <SelectValue placeholder="Select your learning level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="senior_phase">Senior Phase (Grades 7-9)</SelectItem>
                                    <SelectItem value="national_senior">National Senior Certificate (Grades 10-12)</SelectItem>
                                    <SelectItem value="matric_amended">Matric Amended</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="grade">Grade (Optional)</Label>
                            <Select onValueChange={setGrade} value={grade}>
                                <SelectTrigger id="grade">
                                    <SelectValue placeholder="Select your grade (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                                        <SelectItem key={g} value={String(g)}>
                                            Grade {g}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col">
                        <Button 
                            className="w-full" 
                            type="submit" 
                            disabled={
                                loading || 
                                passwordError !== "" || 
                                validatePasswordStrength(password) !== "" ||
                                !password ||
                                !confirmPassword
                            }
                        >
                            {loading ? "Creating account..." : "Create Account"}
                        </Button>
                        <p className="mt-4 text-xs text-center text-muted-foreground">
                            Already have an account?{" "}
                            <Link to="/login" className="underline">
                                Login
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default Register;
