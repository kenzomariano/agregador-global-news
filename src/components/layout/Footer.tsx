import { Link } from "react-router-dom";
import { CATEGORIES } from "@/lib/categories";

export function Footer() {
  return (
    <footer className="border-t bg-card mt-12">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                D
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight font-serif">DESIGNE</h2>
                <p className="text-xs text-muted-foreground -mt-1">Notícias</p>
              </div>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Seu portal de notícias agregadas. As informações mais importantes do Brasil e do mundo em um só lugar.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-4">Categorias</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {Object.entries(CATEGORIES).slice(0, 5).map(([key, { label }]) => (
                <li key={key}>
                  <Link to={`/categoria/${key}`} className="hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Mais Categorias</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {Object.entries(CATEGORIES).slice(5).map(([key, { label }]) => (
                <li key={key}>
                  <Link to={`/categoria/${key}`} className="hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Links Úteis</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/mais-lidas" className="hover:text-foreground transition-colors">
                  Mais Lidas
                </Link>
              </li>
              <li>
                <Link to="/produtos" className="hover:text-foreground transition-colors">
                  Produtos
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} DESIGNE. Todos os direitos reservados.</p>
          <p className="mt-1">
            As notícias exibidas são agregadas de diversas fontes e os direitos autorais pertencem aos respectivos veículos.
          </p>
        </div>
      </div>
    </footer>
  );
}
