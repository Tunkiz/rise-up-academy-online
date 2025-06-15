
```typescript
import React, { useEffect, useState } from 'react';
import { useTour } from '@/hooks/useTour';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export const TourGuide = () => {
  const { isTourActive, steps, currentStep, nextStep, prevStep, stopTour } = useTour();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isTourActive && steps.length > 0) {
      const step = steps[currentStep];
      const element = document.querySelector(step.target) as HTMLElement;
      setTargetElement(element);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetElement(null);
    }
  }, [isTourActive, currentStep, steps]);

  if (!isTourActive || !targetElement || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[9997]"
        onClick={stopTour}
      />
      <Popover open={true}>
        <PopoverTrigger asChild>
          <div
            className="fixed transition-all duration-300"
            style={{
              top: targetElement.getBoundingClientRect().top,
              left: targetElement.getBoundingClientRect().left,
              width: targetElement.getBoundingClientRect().width,
              height: targetElement.getBoundingClientRect().height,
              boxShadow: '0 0 0 4px hsl(var(--background)), 0 0 0 8px hsl(var(--primary))',
              pointerEvents: 'none',
              zIndex: 9998,
              borderRadius: '8px',
            }}
          />
        </PopoverTrigger>
        <PopoverContent
          side={step.placement || 'bottom'}
          align="center"
          className="z-[9999]"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="space-y-2">
            <h3 className="font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.content}</p>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button variant="ghost" size="sm" onClick={stopTour}>Skip</Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} / {steps.length}
              </span>
              {currentStep > 0 && <Button variant="outline" size="sm" onClick={prevStep}>Back</Button>}
              <Button size="sm" onClick={nextStep}>
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
```
