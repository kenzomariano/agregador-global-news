import { Link } from "react-router-dom";
import { Menu, Search, X, LogOut, User, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORIES } from "@/lib/categories";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useCategoriesWithArticles, useHasProducts } from "@/hooks/useMenuVisibility";

// Define primary and secondary categories
const PRIMARY_CATEGORIES = ["politica", "economia", "tecnologia", "esportes", "entretenimento"];
const SECONDARY_CATEGORIES = ["saude", "ciencia", "mundo", "brasil", "cultura"];

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const { data: categoriesWithArticles } = useCategoriesWithArticles();
  const { data: hasProducts } = useHasProducts();

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

  const visiblePrimary = PRIMARY_CATEGORIES.filter(
    (key) => !categoriesWithArticles || categoriesWithArticles.has(key)
  );
  const visibleSecondary = SECONDARY_CATEGORIES.filter(
    (key) => !categoriesWithArticles || categoriesWithArticles.has(key)
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Top bar with date */}
      <div className="border-b bg-primary text-primary-foreground">
        <div className="container flex h-8 items-center justify-between text-sm">
          <span>
            <span className="hidden sm:inline">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="sm:hidden">
              {new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })}
            </span>
          </span>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="hover:underline flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    Painel Admin
                  </Link>
                )}
                <Link to="/conta" className="hover:underline flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Minha Conta
                </Link>
                <button onClick={handleSignOut} className="hover:underline flex items-center gap-1">
                  <LogOut className="h-3 w-3" />
                  Sair
                </button>
              </>
            ) : (
              <Link to="/login" className="hover:underline flex items-center gap-1">
                <User className="h-3 w-3" />
                Entrar / Cadastrar
              </Link>
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
              {visiblePrimary.map((key) => {
                const cat = CATEGORIES[key as keyof typeof CATEGORIES];
                return cat ? (
                  <Link
                    key={key}
                    to={`/categoria/${key}`}
                    className="text-foreground hover:text-primary transition-colors font-medium"
                  >
                    {cat.label}
                  </Link>
                ) : null;
              })}
              
              {visibleSecondary.length > 0 && (
                <>
                  <div className="border-t my-2" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Mais Categorias</p>
                  {visibleSecondary.map((key) => {
                    const cat = CATEGORIES[key as keyof typeof CATEGORIES];
                    return cat ? (
                      <Link
                        key={key}
                        to={`/categoria/${key}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {cat.label}
                      </Link>
                    ) : null;
                  })}
                </>
              )}
              
              <div className="border-t my-2" />
              
              <Link
                to="/mais-lidas"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                🔥 Mais Lidas
              </Link>
              {hasProducts !== false && (
                <Link
                  to="/produtos"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  🛒 Produtos
                </Link>
              )}

              {isAdmin && (
                <>
                  <div className="border-t my-2" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Administração</p>
                  <Link
                    to="/admin"
                    className="text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Painel Admin
                  </Link>
                </>
              )}
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

      {/* Category navigation - Desktop */}
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
            {visiblePrimary.map((key) => {
              const cat = CATEGORIES[key as keyof typeof CATEGORIES];
              return cat ? (
                <li key={key}>
                  <Link
                    to={`/categoria/${key}`}
                    className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors whitespace-nowrap"
                  >
                    {cat.label}
                  </Link>
                </li>
              ) : null;
            })}
            {visibleSecondary.length > 0 && (
              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors flex items-center gap-1">
                      Mais
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {visibleSecondary.map((key) => {
                      const cat = CATEGORIES[key as keyof typeof CATEGORIES];
                      return cat ? (
                        <DropdownMenuItem key={key} asChild>
                          <Link to={`/categoria/${key}`}>{cat.label}</Link>
                        </DropdownMenuItem>
                      ) : null;
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )}
            <li>
              <Link
                to="/mais-lidas"
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                🔥 Mais Lidas
              </Link>
            </li>
            {hasProducts !== false && (
              <li>
                <Link
                  to="/produtos"
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                >
                  🛒 Produtos
                </Link>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </header>
  );
}
