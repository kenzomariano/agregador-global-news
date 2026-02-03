import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import ArticlePage from "./pages/ArticlePage";
import TrendingPage from "./pages/TrendingPage";
import ProductsPage from "./pages/ProductsPage";
import TagPage from "./pages/TagPage";
import AuthPage from "./pages/AuthPage";
import SourcesPage from "./pages/admin/SourcesPage";
import ArticlesPage from "./pages/admin/ArticlesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="designe-theme" attribute="class">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/categoria/:category" element={<CategoryPage />} />
              <Route path="/noticia/:slug" element={<ArticlePage />} />
              <Route path="/mais-lidas" element={<TrendingPage />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/tag/:tag" element={<TagPage />} />
              <Route
                path="/admin/fontes"
                element={
                  <ProtectedRoute>
                    <SourcesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/artigos"
                element={
                  <ProtectedRoute>
                    <ArticlesPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="/login" element={<AuthPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
