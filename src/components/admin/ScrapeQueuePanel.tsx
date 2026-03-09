import { useState, useEffect, useRef } from "react";
import { Clock, Zap, CheckCircle2, XCircle, Loader2, AlertTriangle, Globe, Package, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QueueItem {
  name: string;
  priority: number;
  status: "pending" | "running" | "success" | "error" | "done" | "unknown";
  count?: number;
}

interface ScrapeStatus {
  status: "running" | "completed" | "idle";
  started_at?: string;
  completed_at?: string;
  total_sources: number;
  completed: number;
  current?: string;
  total_items?: number;
  queue: QueueItem[];
}

interface LastRunData {
  timestamp: string;
  sourcesCount: number;
  results: { name: string; status: string; count?: number }[];
}

const priorityLabels: Record<number, { label: string; icon: React.ReactNode }> = {
  1: { label: "Nacional", icon: <FileText className="h-3 w-3" /> },
  2: { label: "Produtos", icon: <Package className="h-3 w-3" /> },
  3: { label: "Internacional", icon: <Globe className="h-3 w-3" /> },
};

function QueueItemRow({ item }: { item: QueueItem }) {
  const statusConfig = {
    pending: { icon: <Clock className="h-4 w-4 text-muted-foreground" />, color: "bg-muted", label: "Aguardando" },
    running: { icon: <Loader2 className="h-4 w-4 text-primary animate-spin" />, color: "bg-primary/20", label: "Extraindo..." },
    success: { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, color: "bg-green-500/10", label: "Concluído" },
    done: { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, color: "bg-green-500/10", label: "Concluído" },
    error: { icon: <XCircle className="h-4 w-4 text-destructive" />, color: "bg-destructive/10", label: "Erro" },
    unknown: { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, color: "bg-yellow-500/10", label: "Desconhecido" },
  };

  const config = statusConfig[item.status] || statusConfig.unknown;
  const priority = priorityLabels[item.priority];

  return (
    <div className={`flex items-center gap-3 rounded-lg p-3 border ${config.color}`}>
      {config.icon}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {priority && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 px-1.5">
              {priority.icon}
              {priority.label}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{config.label}</span>
        </div>
      </div>
      {item.count !== undefined && item.count > 0 && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {item.count} {item.count === 1 ? "item" : "itens"}
        </Badge>
      )}
    </div>
  );
}

export function ScrapeQueuePanel() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [lastRun, setLastRun] = useState<LastRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningManual, setRunningManual] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    const [statusRes, lastRunRes] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "auto_scrape_status").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "auto_scrape_last_run").maybeSingle(),
    ]);

    if (statusRes.data?.value) {
      try { setStatus(JSON.parse(statusRes.data.value)); } catch { /* ignore */ }
    }
    if (lastRunRes.data?.value) {
      try { setLastRun(JSON.parse(lastRunRes.data.value)); } catch { /* ignore */ }
    }
    setLoading(false);
  };

  // Poll while running
  useEffect(() => {
    fetchStatus();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (runningManual || status?.status === "running") {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(fetchStatus, 3000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [runningManual, status?.status]);

  const handleManualRun = async () => {
    setRunningManual(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-scrape", {
        body: { triggered_by: "manual" },
      });
      if (error) throw error;
      toast({
        title: "Scraping concluído!",
        description: `${data.totalItems || 0} itens de ${data.sourcesProcessed || 0} fontes.`,
      });
      await fetchStatus();
    } catch (error: any) {
      toast({
        title: "Erro no scraping automático",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRunningManual(false);
    }
  };

  const isRunning = runningManual || status?.status === "running";
  const progressPercent = status && status.total_sources > 0
    ? Math.round((status.completed / status.total_sources) * 100)
    : 0;

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Fila de Scraping
            </CardTitle>
            <CardDescription className="mt-1">
              Fontes nacionais são processadas primeiro, seguidas por produtos e internacionais.
            </CardDescription>
          </div>
          {isRunning && (
            <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Executando
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar when running */}
        {isRunning && status && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {status.current ? `Extraindo: ${status.current}` : "Iniciando..."}
              </span>
              <span className="font-medium">{status.completed}/{status.total_sources}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Queue items */}
        {status?.queue && status.queue.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {status.queue.map((item, i) => (
              <QueueItemRow key={i} item={item} />
            ))}
          </div>
        )}

        {/* Last run summary (when not running and no queue visible) */}
        {!isRunning && (!status?.queue || status.queue.length === 0) && lastRun && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Última execução
              </Badge>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(lastRun.timestamp), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lastRun.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md p-2 border">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${r.status === "success" ? "bg-green-500" : "bg-destructive"}`} />
                  <span className="font-medium truncate">{r.name}</span>
                  {r.count !== undefined && (
                    <Badge variant="secondary" className="ml-auto text-xs shrink-0">{r.count}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed summary */}
        {!isRunning && status?.status === "completed" && status.queue && status.queue.length > 0 && (
          <div className="flex items-center gap-2 text-sm bg-green-500/10 rounded-lg p-3 border border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span>
              Concluído: <strong>{status.total_items || 0}</strong> itens de{" "}
              <strong>{status.total_sources}</strong> fontes
              {status.completed_at && (
                <span className="text-muted-foreground">
                  {" "}• {formatDistanceToNow(new Date(status.completed_at), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </span>
          </div>
        )}

        {/* No data yet */}
        {!status && !lastRun && (
          <p className="text-sm text-muted-foreground">
            Nenhuma execução registrada. Clique para executar o scraping de todas as fontes.
          </p>
        )}

        <Button
          onClick={handleManualRun}
          disabled={isRunning}
          variant="outline"
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Executando scraping...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Executar Agora (Todas as Fontes)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
