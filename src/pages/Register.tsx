
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
    const [grade, setGrade] = useState("");
    const [learnerCategory, setLearnerCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
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
        } catch (error: any) {
            console.error("Unexpected registration error:", error);
            toast({
                title: "Error signing up",
                description: error.message || "An unexpected error occurred",
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
                                onChange={(e) => setPassword(e.target.value)} 
                            />
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
                        <Button className="w-full" type="submit" disabled={loading}>
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
