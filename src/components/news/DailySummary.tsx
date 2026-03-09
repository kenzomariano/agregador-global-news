import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Summary {
  title: string;
  items: string[];
  date: string;
}

export function DailySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "daily_summary")
        .maybeSingle();

      if (data?.value) {
        try {
          setSummary(JSON.parse(data.value));
        } catch {
          // ignore parse errors
        }
      }
    };
    fetchSummary();
  }, []);

  if (!summary) return null;

  return (
    <Card className="mb-8 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {summary.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{summary.date}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {summary.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
