import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookMarked, BrainCircuit, CalendarCheck, Library } from "lucide-react";
import { Link } from "react-router-dom";
import { useTour } from "@/hooks/useTour";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const features = [
  {
    icon: <BookMarked className="h-8 w-8 text-primary" />,
    title: "Personalized Dashboard",
    description: "Track your progress, lesson completion, and scores with an interactive student dashboard.",
  },
  {
    icon: <BrainCircuit className="h-8 w-8 text-primary" />,
    title: "AI Study Planner",
    description: "Get optimized weekly study schedules tailored to your goals and deadlines.",
  },
  {
    icon: <CalendarCheck className="h-8 w-8 text-primary" />,
    title: "Exam Assistance",
    description: "Step-by-step guidance on government exam registration, complete with calendar integration.",
  },
  {
    icon: <Library className="h-8 w-8 text-primary" />,
    title: "Resource Library",
    description: "Access a vast library of downloadable study guides and past papers for effective revision.",
  },
];

const tourSteps = [
  {
    target: "#feature-0",
    title: "Personalized Dashboard",
    content: "Track your progress, lesson completion, and scores with an interactive student dashboard.",
    placement: "bottom" as const,
  },
  {
    target: "#feature-1",
    title: "AI Study Planner",
    content: "Get optimized weekly study schedules tailored to your goals and deadlines.",
    placement: "bottom" as const,
  },
  {
    target: "#feature-2",
    title: "Exam Assistance",
    content: "Step-by-step guidance on government exam registration, complete with calendar integration.",
    placement: "bottom" as const,
  },
  {
    target: "#feature-3",
    title: "Resource Library",
    content: "Access a vast library of downloadable study guides and past papers for effective revision.",
    placement: "bottom" as const,
  },
  {
    target: '#get-started-link-hero',
    title: 'Get Started',
    content: 'Ready to start? Sign up for free to unlock all these features!',
    placement: 'top' as const,
  }
];

const Index = () => {
  const { startTour, hasCompletedTour, stopTour } = useTour();
  const [showTourPrompt, setShowTourPrompt] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasCompletedTour) {
        setShowTourPrompt(true);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [hasCompletedTour]);

  const handleStartTour = () => {
    setShowTourPrompt(false);
    startTour(tourSteps);
  };
  
  const handleSkipTour = () => {
      setShowTourPrompt(false);
      stopTour();
  }

  return (
    <>
      <div className="flex flex-col">
        {/* Hero Section */}
        <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
          <div className="text-center lg:text-start space-y-6">
            <main className="text-5xl md:text-6xl font-bold animate-fade-in-up">
              <h1 className="inline">
                <span className="inline bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
                  Unlock
                </span>{" "}
                Your Potential
              </h1>{" "}
              with{" "}
              <h2 className="inline">
                <span className="inline bg-gradient-to-r from-[#03a3d7] to-[#007ab7] text-transparent bg-clip-text">
                  EduRise
                </span>
              </h2>
            </main>
            <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0 animate-fade-in-up [animation-delay:0.2s]">
              Your partner in achieving academic excellence. Quality, accessible primary and high school education to help you ace your exams.
            </p>
            <div className="space-y-4 md:space-y-0 md:space-x-4 animate-fade-in-up [animation-delay:0.4s]">
              <Button className="w-full md:w-1/3" asChild>
                  <Link to="/register" id="get-started-link-hero">Get Started</Link>
              </Button>
              <Button variant="outline" className="w-full md:w-1/3" asChild>
                  <Link to="/learning-portal">Explore Lessons <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="z-10 animate-fade-in-up [animation-delay:0.6s]">
            <img src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=2070&auto=format&fit=crop" alt="Hero" className="rounded-lg shadow-2xl" />
          </div>
        </section>

        {/* Features Section */}
        <section className="container py-24 sm:py-32 space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold md:text-center">
              Core{" "}
              <span className="bg-gradient-to-r from-[#61DAFB] to-[#03a3d7] text-transparent bg-clip-text">
                Features
              </span>
            </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                  <Card key={feature.title} id={`feature-${index}`} className="bg-muted/40 animate-fade-in-up" style={{ animationDelay: `${0.2 * (index + 1)}s` }}>
                      <CardHeader>
                          <div className="p-4 bg-primary/10 rounded-full w-fit mb-4">{feature.icon}</div>
                          <CardTitle>{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p className="text-muted-foreground">{feature.description}</p>
                      </CardContent>
                  </Card>
              ))}
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="bg-primary/5">
          <div className="container text-center py-20">
            <h2 className="text-4xl font-bold mb-4">Ready to Rise?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of students on the path to success.
            </p>
            <Button size="lg" asChild>
              <Link to="/register">Sign Up for Free</Link>
            </Button>
          </div>
        </section>
      </div>
      <AlertDialog open={showTourPrompt} onOpenChange={setShowTourPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Welcome to EduRise!</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like a quick tour of our main features?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipTour}>No, thanks</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartTour}>Show me around</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Index;
