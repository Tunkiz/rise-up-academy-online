import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type TourStep = {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  path?: string;
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
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    // Initialize state directly from localStorage to avoid race conditions.
    const completed = localStorage.getItem('tourCompleted') === 'true';
    return completed;
  });
  const navigate = useNavigate();
  const location = useLocation();

  const startTour = useCallback((tourSteps: TourStep[]) => {
    if (tourSteps.length === 0) return;
    setSteps(tourSteps);
    setCurrentStep(0);
    setIsTourActive(true);
    document.body.style.overflow = 'hidden';
    const firstStep = tourSteps[0];
    if (firstStep.path && location.pathname !== firstStep.path) {
      navigate(firstStep.path);
    }
  }, [navigate, location.pathname]);

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
      const nextStepIndex = currentStep + 1;
      const nextStepDetails = steps[nextStepIndex];
      if (nextStepDetails.path && location.pathname !== nextStepDetails.path) {
        navigate(nextStepDetails.path);
      }
      setCurrentStep(nextStepIndex);
    } else {
      stopTour();
    }
  }, [currentStep, steps, stopTour, navigate, location.pathname]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      const prevStepDetails = steps[prevStepIndex];
      if (prevStepDetails.path && location.pathname !== prevStepDetails.path) {
        navigate(prevStepDetails.path);
      }
      setCurrentStep(prevStepIndex);
    }
  }, [currentStep, steps, navigate, location.pathname]);
  
  const value = useMemo(() => ({ isTourActive, currentStep, steps, startTour, stopTour, nextStep, prevStep, hasCompletedTour }), [isTourActive, currentStep, steps, startTour, stopTour, nextStep, prevStep, hasCompletedTour]);

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};
