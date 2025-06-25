
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookMarked, BrainCircuit, CalendarCheck, Library, GraduationCap, Users, Award, Clock } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthProvider";

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

const subjectCategories = [
  {
    title: "Matric Amended Senior Certificate",
    description: "Comprehensive curriculum for students completing their amended matric qualification",
    subjects: ["Mathematics", "English", "Physical Sciences", "Life Sciences", "Geography"],
    icon: <GraduationCap className="h-12 w-12 text-blue-600" />,
    color: "from-blue-500 to-blue-600"
  },
  {
    title: "National Senior Certificate",
    description: "Full NSC curriculum preparing students for university and career success",
    subjects: ["Mathematics", "English", "Physical Sciences", "Life Sciences", "History"],
    icon: <Award className="h-12 w-12 text-green-600" />,
    color: "from-green-500 to-green-600"
  },
  {
    title: "Senior Phase Certificate",
    description: "Foundation subjects for grades 7-9 building essential academic skills",
    subjects: ["Mathematics", "English", "Natural Sciences", "Social Sciences", "Technology"],
    icon: <Users className="h-12 w-12 text-purple-600" />,
    color: "from-purple-500 to-purple-600"
  }
];

const stats = [
  { number: "1000+", label: "Students Enrolled", icon: <Users className="h-6 w-6" /> },
  { number: "50+", label: "Expert Tutors", icon: <GraduationCap className="h-6 w-6" /> },
  { number: "95%", label: "Pass Rate", icon: <Award className="h-6 w-6" /> },
  { number: "24/7", label: "Support Available", icon: <Clock className="h-6 w-6" /> },
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
  const { user } = useAuth();
  const { startTour, isTourCompleted, markTourAsCompleted } = useTour();
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const tourId = 'features';

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user && !isTourCompleted(tourId)) {
        setShowTourPrompt(true);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [isTourCompleted, user]);

  const handleStartTour = () => {
    setShowTourPrompt(false);
    startTour(tourSteps, tourId);
  };
  
  const handleSkipTour = () => {
      setShowTourPrompt(false);
      markTourAsCompleted(tourId);
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
                {user ? (
                  <Link to="/dashboard" id="get-started-link-hero">Go to Dashboard</Link>
                ) : (
                  <Link to="/register" id="get-started-link-hero">Get Started</Link>
                )}
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

        {/* Stats Section */}
        <section className="bg-muted/30 py-16">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={stat.label} className="text-center animate-fade-in-up" style={{ animationDelay: `${0.1 * index}s` }}>
                  <div className="flex justify-center mb-2 text-primary">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-primary mb-1">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subject Categories Section */}
        <section className="container py-24 sm:py-32 space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Educational{" "}
              <span className="bg-gradient-to-r from-[#61DAFB] to-[#03a3d7] text-transparent bg-clip-text">
                Pathways
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose from our comprehensive curriculum designed to meet your educational goals and certification requirements.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {subjectCategories.map((category, index) => (
              <Card key={category.title} className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${0.2 * index}s` }}>
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    {category.icon}
                  </div>
                  <CardTitle className="text-lg leading-tight">{category.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-center">{category.description}</p>
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Key Subjects:</p>
                    <div className="flex flex-wrap gap-1">
                      {category.subjects.map((subject) => (
                        <span key={subject} className="text-xs bg-muted px-2 py-1 rounded-full">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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

        {/* Why Choose EduRise Section */}
        <section className="bg-muted/30 py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl lg:text-4xl font-bold">
                  Why Choose{" "}
                  <span className="bg-gradient-to-r from-[#61DAFB] to-[#03a3d7] text-transparent bg-clip-text">
                    EduRise?
                  </span>
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Certified Curriculum</h3>
                      <p className="text-muted-foreground">All our courses align with official educational standards and certification requirements.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Expert Instructors</h3>
                      <p className="text-muted-foreground">Learn from qualified educators with years of teaching experience and subject expertise.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Flexible Learning</h3>
                      <p className="text-muted-foreground">Study at your own pace with 24/7 access to lessons, resources, and support materials.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" 
                  alt="Students learning" 
                  className="rounded-lg shadow-xl"
                />
              </div>
            </div>
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
              {user ? (
                <Link to="/dashboard">Go to Dashboard</Link>
              ) : (
                <Link to="/register">Sign Up for Free</Link>
              )}
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
