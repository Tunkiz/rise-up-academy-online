
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, BookOpenCheck, User, Shield, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationBell from "./NotificationBell";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/learning-portal", label: "Learning Portal" },
  { to: "/exam-assistance", label: "Exam Assistance" },
  { to: "/study-planner", label: "Study Planner" },
  { to: "/resource-library", label: "Resource Library" },
];

const NavLinkItem = ({ to, label, onClick, id }: { to: string; label: string, onClick: () => void; id?: string; }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `text-sm font-medium transition-colors hover:text-primary ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`
    }
    onClick={onClick}
    id={id}
  >
    {label}
  </NavLink>
);

export function Header() {  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="font-bold">EduRise</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navLinks.map((link) => (
            <NavLinkItem key={link.to} to={link.to} label={link.label} onClick={() => {}} id={`nav${link.to.replace(/\//g, '-')}`} />
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
          {user ? (
            <div className="flex items-center gap-1">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full" id="user-menu-button">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata.full_name} />
                      <AvatarFallback>{getInitials(user.user_metadata.full_name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.user_metadata.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>                  {isAdmin && (
                    <DropdownMenuItem onSelect={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </DropdownMenuItem>
                  )}
                  {isSuperAdmin && (
                    <DropdownMenuItem onSelect={() => navigate('/super-admin')}>
                      <Shield className="mr-2 h-4 w-4 text-amber-500" />
                      <span>Super Admin</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Sign Up</Link>
              </Button>
            </div>
          )}
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
                <div className="border-t pt-6 mt-4">
                  {user ? (
                    <div className="space-y-4">
                      <Button variant="outline" className="w-full justify-start" onClick={() => { navigate('/profile'); setIsSheetOpen(false); }}>
                        <User className="mr-2 h-4 w-4" /> Profile
                      </Button>                      {isAdmin && (
                        <Button variant="outline" className="w-full justify-start" onClick={() => { navigate('/admin'); setIsSheetOpen(false); }}>
                          <Shield className="mr-2 h-4 w-4" /> Admin Panel
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <Button variant="outline" className="w-full justify-start" onClick={() => { navigate('/super-admin'); setIsSheetOpen(false); }}>
                          <Shield className="mr-2 h-4 w-4 text-amber-500" /> Super Admin
                        </Button>
                      )}
                      <Button variant="outline" className="w-full justify-start" onClick={() => { handleLogout(); setIsSheetOpen(false); }}>
                        <LogOut className="mr-2 h-4 w-4" /> Log out
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button variant="outline" className="w-full" asChild onClick={() => setIsSheetOpen(false)}>
                        <Link to="/login">Login</Link>
                      </Button>
                      <Button className="w-full" asChild onClick={() => setIsSheetOpen(false)}>
                        <Link to="/register">Sign Up</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
