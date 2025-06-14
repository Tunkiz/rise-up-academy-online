
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, BookOpenCheck } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/learning-portal", label: "Learning Portal" },
  { to: "/exam-assistance", label: "Exam Assistance" },
  { to: "/study-planner", label: "Study Planner" },
  { to: "/resource-library", label: "Resource Library" },
];

const NavLinkItem = ({ to, label, onClick }: { to: string; label: string, onClick: () => void; }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `text-sm font-medium transition-colors hover:text-primary ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`
    }
    onClick={onClick}
  >
    {label}
  </NavLink>
);

export function Header() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="font-bold">EduRise</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navLinks.map((link) => (
            <NavLinkItem key={link.to} to={link.to} label={link.label} onClick={() => {}} />
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <Button variant="ghost" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Sign Up</Link>
          </Button>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="grid gap-6 text-lg font-medium pt-8">
                <Link to="/" className="flex items-center space-x-2 mb-4" onClick={() => setIsSheetOpen(false)}>
                  <BookOpenCheck className="h-6 w-6 text-primary" />
                  <span className="font-bold">EduRise</span>
                </Link>
                {navLinks.map((link) => (
                   <NavLinkItem key={link.to} to={link.to} label={link.label} onClick={() => setIsSheetOpen(false)} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
