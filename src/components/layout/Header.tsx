import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, X, LogOut, User, ChevronDown, Settings, Home, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

const PRIMARY_CATEGORIES = ["politica", "economia", "tecnologia", "esportes", "entretenimento"];
const SECONDARY_CATEGORIES = ["saude", "ciencia", "mundo", "brasil", "cultura"];

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: categoriesWithArticles } = useCategoriesWithArticles();
  const { data: hasProducts } = useHasProducts();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/buscar?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: "Erro ao sair", description: "Tente novamente.", variant: "destructive" });
    } else {
      toast({ title: "Até logo!", description: "Você saiu da sua conta." });
    }
  };

  const visiblePrimary = PRIMARY_CATEGORIES.filter(
    (key) => !categoriesWithArticles || categoriesWithArticles.has(key as any)
  );
  const visibleSecondary = SECONDARY_CATEGORIES.filter(
    (key) => !categoriesWithArticles || categoriesWithArticles.has(key as any)
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Top bar */}
      <div className="border-b bg-primary text-primary-foreground">
        <div className="container flex h-8 items-center justify-between text-xs sm:text-sm">
          <span className="truncate max-w-[180px] sm:max-w-none">
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
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="hover:underline hidden sm:flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    Admin
                  </Link>
                )}
                <Link to="/conta" className="hover:underline flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="hidden sm:inline">Minha Conta</span>
                  <span className="sm:hidden">Conta</span>
                </Link>
                <button onClick={handleSignOut} className="hover:underline flex items-center gap-1">
                  <LogOut className="h-3 w-3" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="hover:underline flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="hidden sm:inline">Entrar / Cadastrar</span>
                <span className="sm:hidden">Entrar</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container flex h-14 sm:h-16 items-center justify-between gap-2">
        {/* Mobile menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-80 p-0 flex flex-col">
            <SheetHeader className="px-4 pt-5 pb-3 border-b">
              <SheetTitle className="flex items-center gap-2 text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
                  D
                </div>
                <div>
                  <p className="font-bold font-serif leading-none">DESIGNE</p>
                  <p className="text-xs text-muted-foreground font-normal">Notícias</p>
                </div>
              </SheetTitle>
            </SheetHeader>

            <nav className="flex-1 overflow-y-auto py-3">
              {/* Home */}
              <Link
                to="/"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                <Home className="h-4 w-4 text-muted-foreground" />
                Início
              </Link>

              <Link
                to="/mais-lidas"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Flame className="h-4 w-4" />
                Mais Lidas
              </Link>

              {/* Primary categories */}
              {visiblePrimary.length > 0 && (
                <div className="mt-2">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Categorias
                  </p>
                  {visiblePrimary.map((key) => {
                    const cat = CATEGORIES[key as keyof typeof CATEGORIES];
                    return cat ? (
                      <Link
                        key={key}
                        to={`/categoria/${key}`}
                        onClick={() => setSheetOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
                      >
                        <span className="text-base leading-none">{cat.icon}</span>
                        {cat.label}
                      </Link>
                    ) : null;
                  })}
                </div>
              )}

              {/* Secondary categories */}
              {visibleSecondary.length > 0 && (
                <div className="mt-2">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Mais Categorias
                  </p>
                  {visibleSecondary.map((key) => {
                    const cat = CATEGORIES[key as keyof typeof CATEGORIES];
                    return cat ? (
                      <Link
                        key={key}
                        to={`/categoria/${key}`}
                        onClick={() => setSheetOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <span className="text-base leading-none">{cat.icon}</span>
                        {cat.label}
                      </Link>
                    ) : null;
                  })}
                </div>
              )}

              {/* Extra links */}
              <div className="mt-2 border-t pt-2">
                {hasProducts !== false && (
                  <Link
                    to="/produtos"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="text-base leading-none">🛒</span>
                    Produtos
                  </Link>
                )}
                <Link
                  to="/guias"
                  onClick={() => setSheetOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span className="text-base leading-none">📖</span>
                  Guias
                </Link>
              </div>

              {/* Admin */}
              {isAdmin && (
                <div className="mt-2 border-t pt-2">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Administração
                  </p>
                  <Link
                    to="/admin"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Painel Admin
                  </Link>
                </div>
              )}
            </nav>

            {/* User section at bottom */}
            {user && (
              <div className="border-t p-4 space-y-2">
                <Link
                  to="/conta"
                  onClick={() => setSheetOpen(false)}
                  className="flex items-center gap-3 py-2 text-sm hover:text-primary transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Minha Conta
                </Link>
                <button
                  onClick={() => { handleSignOut(); setSheetOpen(false); }}
                  className="flex items-center gap-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg sm:text-xl">
            D
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold tracking-tight font-serif">DESIGNE</h1>
            <p className="text-xs text-muted-foreground -mt-1">Notícias</p>
          </div>
        </Link>

        {/* Mobile: show logo text too */}
        <div className="sm:hidden flex-1 flex justify-center">
          <span className="font-bold font-serif text-lg tracking-tight">DESIGNE</span>
        </div>

        {/* Search and Theme Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-1">
              <Input
                type="search"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 sm:w-56 h-9"
                autoFocus
              />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(true)}>
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
              <Link to="/" className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors">
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
                <Link to="/produtos" className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors">
                  🛒 Produtos
                </Link>
              </li>
            )}
            <li>
              <Link to="/guias" className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors">
                📖 Guias
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
