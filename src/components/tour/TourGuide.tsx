
import React, { useEffect, useState } from 'react';
import { useTour } from '@/hooks/useTour';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export const TourGuide = () => {
  const { isTourActive, steps, currentStep, nextStep, prevStep, stopTour } = useTour();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isTourActive && steps.length > 0) {
      const step = steps[currentStep];
      console.log(`[TourGuide] Starting step ${currentStep + 1}/${steps.length}`, step);
      
      const timer = setTimeout(() => {
        const element = document.querySelector(step.target) as HTMLElement;
        console.log(`[TourGuide] Searching for target: "${step.target}". Found element:`, element);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
             console.warn(`[TourGuide] Target element for step ${currentStep + 1} was found, but it is not visible (has zero width or height).`, element);
             setTargetElement(null);
          } else {
            setTargetElement(element);
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          console.error(`[TourGuide] Target element with selector "${step.target}" for step ${currentStep + 1} was not found in the DOM.`);
          setTargetElement(null);
        }
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setTargetElement(null);
    }
  }, [isTourActive, currentStep, steps]);

  if (!isTourActive || !targetElement || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];

  const tourContent = (
    <div className="p-4 sm:p-0">
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
    </div>
  );

  const highlightBox = (
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
  );
  
  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[9997]"
        onClick={stopTour}
      />
      
      {isMobile ? (
        <>
          {highlightBox}
          <Sheet open={true} onOpenChange={(open) => !open && stopTour()}>
              <SheetContent side="bottom" className="z-[9999]" onInteractOutside={(e) => e.preventDefault()}>
                  {tourContent}
              </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover open={true}>
          <PopoverTrigger asChild>
            {highlightBox}
          </PopoverTrigger>
          <PopoverContent
            side={step.placement || 'bottom'}
            align="center"
            className="z-[9999]"
            onInteractOutside={(e) => e.preventDefault()}
          >
            {tourContent}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
};
