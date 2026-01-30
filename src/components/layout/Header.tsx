import { Link } from "react-router-dom";
import { Menu, Search, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/categories";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/buscar?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Até logo!",
        description: "Você saiu da sua conta.",
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Top bar with date */}
      <div className="border-b bg-primary text-primary-foreground">
        <div className="container flex h-8 items-center justify-between text-sm">
          <span>
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <Link to="/admin/fontes" className="hover:underline flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Gerenciar Fontes
                </Link>
                <button onClick={handleSignOut} className="hover:underline flex items-center gap-1">
                  <LogOut className="h-3 w-3" />
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <nav className="mt-8 flex flex-col gap-4">
              <Link to="/" className="text-lg font-semibold">
                Início
              </Link>
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <Link
                  key={key}
                  to={`/categoria/${key}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </Link>
              ))}
              <Link
                to="/mais-lidas"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Mais Lidas
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
            D
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold tracking-tight font-serif">DESIGNE</h1>
            <p className="text-xs text-muted-foreground -mt-1">Notícias</p>
          </div>
        </Link>

        {/* Search and Theme Toggle */}
        <div className="flex items-center gap-2">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                type="search"
                placeholder="Buscar notícias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-64"
                autoFocus
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
              <span className="sr-only">Buscar</span>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Category navigation */}
      <nav className="hidden md:block border-t bg-background">
        <div className="container">
          <ul className="flex items-center gap-1 overflow-x-auto py-2">
            <li>
              <Link
                to="/"
                className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
              >
                Início
              </Link>
            </li>
            {Object.entries(CATEGORIES).map(([key, { label }]) => (
              <li key={key}>
                <Link
                  to={`/categoria/${key}`}
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors whitespace-nowrap"
                >
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/mais-lidas"
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                🔥 Mais Lidas
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
