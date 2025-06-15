
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
  startTour: (steps: TourStep[], tourId: string) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  isTourCompleted: (tourId: string) => boolean;
  markTourAsCompleted: (tourId: string) => void;
};

export const TourContext = createContext<TourContextType | null>(null);

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [completedTours, setCompletedTours] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      const storedTours = localStorage.getItem('completedTours');
      if (storedTours) {
        setCompletedTours(JSON.parse(storedTours));
      }
    } catch (error) {
      console.error("Failed to parse completed tours from localStorage", error);
      setCompletedTours({});
    }
  }, []);

  const markTourAsCompleted = useCallback((tourId: string) => {
    setCompletedTours(prev => {
        const newCompleted = { ...prev, [tourId]: true };
        try {
            localStorage.setItem('completedTours', JSON.stringify(newCompleted));
        } catch (error) {
            console.error("Failed to save completed tours to localStorage", error);
        }
        return newCompleted;
    });
  }, []);

  const startTour = useCallback((tourSteps: TourStep[], tourId: string) => {
    if (tourSteps.length === 0) return;
    setSteps(tourSteps);
    setCurrentStep(0);
    setActiveTourId(tourId);
    setIsTourActive(true);
    document.body.style.overflow = 'hidden';
    const firstStep = tourSteps[0];
    if (firstStep.path && location.pathname !== firstStep.path) {
      navigate(firstStep.path);
    }
  }, [navigate, location.pathname]);

  const stopTour = useCallback(() => {
    if (activeTourId) {
      markTourAsCompleted(activeTourId);
    }
    setIsTourActive(false);
    setSteps([]);
    setCurrentStep(0);
    setActiveTourId(null);
    document.body.style.overflow = '';
  }, [activeTourId, markTourAsCompleted]);

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
  
  const isTourCompleted = useCallback((tourId: string) => {
    return !!completedTours[tourId];
  }, [completedTours]);

  const value = useMemo(() => ({ isTourActive, currentStep, steps, startTour, stopTour, nextStep, prevStep, isTourCompleted, markTourAsCompleted }), [isTourActive, currentStep, steps, startTour, stopTour, nextStep, prevStep, isTourCompleted, markTourAsCompleted]);

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};
