import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MultiStepRegistrationData, RegistrationStep } from '@/types/enrollment';

// Import step components
import { BasicInfoStep } from './steps/BasicInfoStep';
import { CourseSelectionStep } from './steps/CourseSelectionStep';
import { ConfirmationStep } from './steps/ConfirmationStep';

const REGISTRATION_STEPS: RegistrationStep[] = [
  {
    step: 1,
    title: 'Basic Information',
    description: 'Enter your personal details',
    isCompleted: false,
    isActive: true,
  },
  {
    step: 2,
    title: 'Course Selection',
    description: 'Choose your subjects',
    isCompleted: false,
    isActive: false,
  },
  {
    step: 3,
    title: 'Confirmation',
    description: 'Review and submit',
    isCompleted: false,
    isActive: false,
  },
];

interface MultiStepRegistrationFormProps {
  onComplete: (data: MultiStepRegistrationData) => void;
  loading?: boolean;
}

export const MultiStepRegistrationForm: React.FC<MultiStepRegistrationFormProps> = ({
  onComplete,
  loading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState(REGISTRATION_STEPS);
  const [formData, setFormData] = useState<MultiStepRegistrationData>({
    fullName: '',
    email: '',
    password: '',
    subjectCategory: '',
    selectedSubjects: [],
    termsAccepted: false,
    marketingConsent: false,
  });

  const updateStepStatus = (stepNumber: number, isCompleted: boolean, isActive: boolean) => {
    setSteps(prev => prev.map(step => {
      if (step.step === stepNumber) {
        return { ...step, isCompleted, isActive };
      }
      if (step.step === stepNumber + 1) {
        return { ...step, isActive: isCompleted };
      }
      if (step.step < stepNumber) {
        return { ...step, isActive: false };
      }
      return step;
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      updateStepStatus(currentStep, true, false);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      updateStepStatus(currentStep, false, false);
      setCurrentStep(currentStep - 1);
      updateStepStatus(currentStep - 1, false, true);
    }
  };

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber <= currentStep) {
      setCurrentStep(stepNumber);
      setSteps(prev => prev.map(step => ({
        ...step,
        isActive: step.step === stepNumber,
      })));
    }
  };

  const handleFormDataUpdate = (updates: Partial<MultiStepRegistrationData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = () => {
    onComplete(formData);
  };

  const progressPercentage = ((currentStep - 1) / 2) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            data={formData}
            onChange={handleFormDataUpdate}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <CourseSelectionStep
            data={formData}
            onChange={handleFormDataUpdate}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 3:
        return (
          <ConfirmationStep
            data={formData}
            onChange={handleFormDataUpdate}
            onSubmit={handleSubmit}
            onPrevious={handlePrevious}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Header */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Student Registration</CardTitle>
          <div className="space-y-4">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between">
              {steps.map((step) => {
                const getTextColor = () => {
                  if (step.isActive) return 'text-primary';
                  if (step.isCompleted) return 'text-green-600';
                  return 'text-muted-foreground';
                };

                const getIcon = () => {
                  if (step.isCompleted) {
                    return <CheckCircle className="w-6 h-6 text-green-600" />;
                  }
                  if (step.isActive) {
                    return <Circle className="w-6 h-6 text-primary fill-primary" />;
                  }
                  return <Circle className="w-6 h-6" />;
                };

                return (
                  <button
                    key={step.step}
                    type="button"
                    className={`flex flex-col items-center space-y-2 transition-all ${getTextColor()}`}
                    onClick={() => handleStepClick(step.step)}
                    disabled={step.step > currentStep}
                  >
                    <div className="flex items-center justify-center">
                      {getIcon()}
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs text-muted-foreground">{step.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Status Badge */}
      <div className="flex justify-center">
        <Badge variant={currentStep === 3 ? 'default' : 'outline'} className="text-sm">
          Step {currentStep} of 3: {steps.find(s => s.step === currentStep)?.title}
        </Badge>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
};
