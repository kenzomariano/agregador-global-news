import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function NewsletterWidget() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.trim().toLowerCase() });

      if (error && error.code === "23505") {
        toast.info("E-mail já cadastrado!");
      } else if (error) {
        throw error;
      } else {
        setDone(true);
        toast.success("Inscrito com sucesso!");
      }
    } catch {
      toast.error("Erro ao inscrever.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-lg border bg-card p-4 text-center">
        <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
        <p className="text-sm font-medium">Inscrito com sucesso!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">Newsletter</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Receba as principais notícias no seu e-mail.
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="text-sm"
        />
        <Button type="submit" size="sm" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Inscrever-se"}
        </Button>
      </form>
    </div>
  );
}
