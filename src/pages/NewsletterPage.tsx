import { useState } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredBreadcrumb } from "@/components/seo/StructuredBreadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.trim().toLowerCase() });

      if (error) {
        if (error.code === "23505") {
          toast.info("Este e-mail já está cadastrado!");
        } else {
          throw error;
        }
      } else {
        setSubscribed(true);
        toast.success("Inscrição realizada com sucesso!");
      }
    } catch {
      toast.error("Erro ao se inscrever. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Newsletter"
        description="Inscreva-se na newsletter do DESIGNE e receba as notícias mais importantes do dia diretamente no seu e-mail."
        keywords={["newsletter", "notícias", "email", "inscrever"]}
      />

      <div className="container max-w-2xl py-8">
        <StructuredBreadcrumb items={[
          { label: "Início", href: "/" },
          { label: "Newsletter" },
        ]} />

        <Card className="mt-6">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">Newsletter DESIGNE</CardTitle>
            <CardDescription className="text-base">
              Receba as notícias mais importantes do dia direto no seu e-mail. Grátis e sem spam.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscribed ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-semibold">Inscrição confirmada!</p>
                <p className="text-muted-foreground mt-2">
                  Você receberá as melhores notícias em breve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Inscrever-se
                </Button>
              </form>
            )}

            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li>✅ Resumo diário das notícias mais importantes</li>
              <li>✅ Ofertas e promoções exclusivas</li>
              <li>✅ 100% gratuito, cancele quando quiser</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
