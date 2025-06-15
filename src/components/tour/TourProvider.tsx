
```typescript
import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react';

type TourStep = {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
};

type TourContextType = {
  isTourActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (steps: TourStep[]) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  hasCompletedTour: boolean;
};

export const TourContext = createContext<TourContextType | null>(null);

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('tourCompleted');
    if (!tourCompleted) {
      setHasCompletedTour(false);
    }
  }, []);

  const startTour = useCallback((tourSteps: TourStep[]) => {
    setSteps(tourSteps);
    setCurrentStep(0);
    setIsTourActive(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const stopTour = useCallback(() => {
    setIsTourActive(false);
    setSteps([]);
    setCurrentStep(0);
    localStorage.setItem('tourCompleted', 'true');
    setHasCompletedTour(true);
    document.body.style.overflow = '';
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      stopTour();
    }
  }, [currentStep, steps.length, stopTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);
  
  const value = useMemo(() => ({ isTourActive, currentStep, steps, startTour, stopTour, nextStep, prevStep, hasCompletedTour }), [isTourActive, currentStep, steps, startTour, stopTour, nextStep, prevStep, hasCompletedTour]);

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};
```
