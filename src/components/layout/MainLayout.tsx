
import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { useAuth } from "@/contexts/AuthProvider";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function MainLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate("/login");
    }
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <Skeleton className="h-6 w-24" />
            <div className="flex flex-1 items-center justify-end space-x-4">
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </header>
        <main className="flex-1 container py-10">
          <Skeleton className="h-8 w-1/2 mb-8" />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64 lg:col-span-3" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{<Outlet />}</main>
      <Footer />
    </div>
  );
}
