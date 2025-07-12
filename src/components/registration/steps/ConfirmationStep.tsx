import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  User, 
  BookOpen, 
  AlertCircle
} from 'lucide-react';
import { MultiStepRegistrationData } from '@/types/enrollment';

interface ConfirmationStepProps {
  data: MultiStepRegistrationData;
  onChange: (updates: Partial<MultiStepRegistrationData>) => void;
  onSubmit: () => void;
  onPrevious: () => void;
  loading?: boolean;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  data,
  onChange,
  onSubmit,
  onPrevious,
  loading = false,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!data.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Please review your information before creating your temporary account. You can complete payment after registration.
        </AlertDescription>
      </Alert>

      {/* Personal Information Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{data.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{data.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subject Category</p>
              <p className="font-medium">{data.subjectCategory.replace('_', ' ').toUpperCase()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Selected Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Number of subjects:</span>
              <Badge variant="outline">{data.selectedSubjects.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              You can complete payment for these subjects after creating your account.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <CheckCircle className="w-5 h-5" />
            What Happens Next?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Your temporary account will be created instantly</li>
            <li>You can explore the platform and view course materials</li>
            <li>Complete payment for your selected subjects when ready</li>
            <li>Once payment is verified, you'll gain full access to interactive features</li>
            <li>Start learning immediately with our comprehensive resources</li>
          </ol>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="termsAccepted"
                checked={data.termsAccepted}
                onCheckedChange={(checked) => 
                  onChange({ termsAccepted: checked as boolean })
                }
                className={errors.termsAccepted ? 'border-red-500' : ''}
              />
              <div className="space-y-1">
                <label
                  htmlFor="termsAccepted"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the terms and conditions *
                </label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, you agree to our{' '}
                  <button 
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => window.open('/terms', '_blank')}
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button 
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => window.open('/privacy', '_blank')}
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>
            {errors.termsAccepted && (
              <p className="text-sm text-red-500 ml-6">{errors.termsAccepted}</p>
            )}

            <div className="flex items-start space-x-3">
              <Checkbox
                id="marketingConsent"
                checked={data.marketingConsent}
                onCheckedChange={(checked) => 
                  onChange({ marketingConsent: checked as boolean })
                }
              />
              <div className="space-y-1">
                <label
                  htmlFor="marketingConsent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I would like to receive updates and promotional emails
                </label>
                <p className="text-xs text-muted-foreground">
                  Optional: Subscribe to our newsletter for course updates and special offers
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={loading}>
          Previous
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="min-w-[140px]"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Account...
            </>
          ) : (
            'Create Temporary Account'
          )}
        </Button>
      </div>
    </div>
  );
};
