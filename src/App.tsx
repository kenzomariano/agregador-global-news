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
import ProductDetailPage from "./pages/ProductDetailPage";
import TagPage from "./pages/TagPage";
import AuthPage from "./pages/AuthPage";
import SearchPage from "./pages/SearchPage";
import NewsletterPage from "./pages/NewsletterPage";
import GuidesListPage from "./pages/GuidesListPage";
import GuidePage from "./pages/GuidePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AccountPage from "./pages/AccountPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="designe-theme" attribute="class">
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
              <Route path="/produto/:slug" element={<ProductDetailPage />} />
              <Route path="/tag/:tag" element={<TagPage />} />
              <Route path="/buscar" element={<SearchPage />} />
              <Route path="/guias" element={<GuidesListPage />} />
              <Route path="/guia/:slug" element={<GuidePage />} />
              <Route path="/newsletter" element={<NewsletterPage />} />
              <Route path="/conta" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
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
