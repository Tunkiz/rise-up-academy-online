
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { MultiStepRegistrationForm } from "@/components/registration/MultiStepRegistrationForm";
import { MultiStepRegistrationData } from "@/types/enrollment";

const Register = () => {
    const [loading, setLoading] = useState(false);
    const [showMultiStep, setShowMultiStep] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleStudentRegistration = () => {
        setShowMultiStep(true);
    };

    const handleRegistrationComplete = async (data: MultiStepRegistrationData) => {
        setLoading(true);
        
        try {
            // Create temporary user account
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                        subject_category: data.subjectCategory,
                        selected_subjects: data.selectedSubjects,
                        grade: data.subjectCategory === 'grade_1_12' ? 'not_specified' : 'not_applicable',
                    },
                },
            });

            if (authError) {
                throw authError;
            }

            if (!authData.user) {
                throw new Error('Failed to create user account');
            }

            toast({
                title: "Account Created Successfully!",
                description: "Your temporary account has been created. You can now explore the platform and complete payment later.",
            });

            navigate("/dashboard");
        } catch (error) {
            console.error("Registration error:", error);
            toast({
                title: "Registration Failed",
                description: error instanceof Error ? error.message : "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (showMultiStep) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
                <MultiStepRegistrationForm
                    onComplete={handleRegistrationComplete}
                    loading={loading}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Join Rise Up Academy</CardTitle>
                    <CardDescription>
                        Choose your registration type to get started
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <Button 
                            onClick={handleStudentRegistration}
                            className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                            size="lg"
                        >
                            <div className="text-lg font-semibold">Student Registration</div>
                            <div className="text-sm opacity-90">Create temporary account - Pay later</div>
                        </Button>
                        
                        <Button 
                            variant="outline"
                            onClick={() => navigate('/register/tutor')}
                            className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                            size="lg"
                        >
                            <div className="text-lg font-semibold">Tutor Registration</div>
                            <div className="text-sm opacity-70">Apply to become a tutor</div>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link 
                                to="/login" 
                                className="text-primary hover:underline font-medium"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Register;
