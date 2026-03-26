import { useState, useEffect } from "react";
import { useSavedReports, useCreateSavedReport, useUpdateSavedReport, useDeleteSavedReport, type SavedReport } from "@/hooks/useSavedReports";
import { ReportContent } from "./ReportContent";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Plus, CalendarIcon, Pencil, Trash2, Save, Check, X, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type ReportType = "responsavel_atualizacao" | "responsavel" | "fase" | "tag" | "sapron" | "cards_periodo";
type PeriodPreset = "hoje" | "7dias" | "30dias" | "custom";

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "responsavel_atualizacao", label: "Cards por responsável de atualização de laudo" },
  { value: "responsavel", label: "Cards por responsável" },
  { value: "fase", label: "Cards por fase" },
  { value: "tag", label: "Cards por tag" },
  { value: "sapron", label: "Laudo adicionado na Sapron" },
  { value: "cards_periodo", label: "Cards criados no período" },
];

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "Últimos 7 dias" },
  { value: "30dias", label: "Últimos 30 dias" },
  { value: "custom", label: "Personalizado" },
];

export function KanbanReports() {
  const { data: savedReports, isLoading } = useSavedReports();
  const createReport = useCreateSavedReport();
  const updateReport = useUpdateSavedReport();
  const deleteReport = useDeleteSavedReport();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // Local state for current report config
  const [reportType, setReportType] = useState<ReportType>("responsavel_atualizacao");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("30dias");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);

  // When saved reports load, auto-select the first one
  useEffect(() => {
    if (savedReports && savedReports.length > 0 && !selectedReportId) {
      loadReport(savedReports[0]);
    }
  }, [savedReports]);

  const loadReport = (report: SavedReport) => {
    setSelectedReportId(report.id);
    setReportType(report.report_type as ReportType);
    setPeriodPreset(report.period_preset as PeriodPreset);
    setCustomStart(report.custom_start ? new Date(report.custom_start) : undefined);
    setCustomEnd(report.custom_end ? new Date(report.custom_end) : undefined);
  };

  const handleCreate = () => {
    createReport.mutate("Novo Relatório", {
      onSuccess: (data) => {
        loadReport(data);
        setEditingNameId(data.id);
        setEditingNameValue(data.name);
        toast.success("Relatório criado!");
      },
      onError: () => toast.error("Erro ao criar relatório."),
    });
  };

  const handleSave = () => {
    if (!selectedReportId) return;
    updateReport.mutate({
      id: selectedReportId,
      updates: {
        report_type: reportType,
        period_preset: periodPreset,
        custom_start: periodPreset === "custom" && customStart ? format(customStart, "yyyy-MM-dd") : null,
        custom_end: periodPreset === "custom" && customEnd ? format(customEnd, "yyyy-MM-dd") : null,
      },
    }, {
      onSuccess: () => toast.success("Relatório salvo!"),
      onError: () => toast.error("Erro ao salvar."),
    });
  };

  const handleRename = (id: string) => {
    if (!editingNameValue.trim()) return;
    updateReport.mutate({ id, updates: { name: editingNameValue.trim() } }, {
      onSuccess: () => {
        setEditingNameId(null);
        toast.success("Renomeado!");
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteReport.mutate(id, {
      onSuccess: () => {
        if (selectedReportId === id) {
          setSelectedReportId(null);
        }
        toast.success("Relatório excluído!");
      },
      onError: () => toast.error("Erro ao excluir."),
    });
  };

  const selectedReport = savedReports?.find(r => r.id === selectedReportId);

  return (
    <div className="flex h-full">
      {/* Sidebar with saved reports */}
      <div className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-3 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Relatórios salvos</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="text-xs text-muted-foreground p-2">Carregando...</div>
          ) : (
            (savedReports ?? []).map(report => (
              <div
                key={report.id}
                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                  selectedReportId === report.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
                }`}
                onClick={() => loadReport(report)}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                {editingNameId === report.id ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                    <Input
                      value={editingNameValue}
                      onChange={e => setEditingNameValue(e.target.value)}
                      className="h-6 text-xs px-1.5 py-0"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === "Enter") handleRename(report.id);
                        if (e.key === "Escape") setEditingNameId(null);
                      }}
                    />
                    <button onClick={() => handleRename(report.id)} className="text-primary hover:text-primary/80">
                      <Check className="h-3 w-3" />
                    </button>
                    <button onClick={() => setEditingNameId(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-medium truncate flex-1">{report.name}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingNameId(report.id); setEditingNameValue(report.name); }}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        {/* Create button */}
        <div className="p-2 border-t border-border">
          <button
            onClick={handleCreate}
            disabled={createReport.isPending}
            className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-muted-foreground/30 rounded-md py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
            Criar relatório
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedReport ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
              <Plus className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Nenhum relatório selecionado</p>
              <p className="text-xs mt-1">Clique em "Criar relatório" para começar</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 max-w-4xl">
            {/* Report name */}
            <h2 className="text-lg font-bold text-foreground">{selectedReport.name}</h2>

            {/* Period selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Período:</span>
              {PERIOD_OPTIONS.map(p => (
                <Button
                  key={p.value}
                  variant={periodPreset === p.value ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setPeriodPreset(p.value)}
                >
                  {p.label}
                </Button>
              ))}
              {periodPreset === "custom" && (
                <div className="flex items-center gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {customStart ? format(customStart, "dd/MM/yyyy") : "Início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground">até</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {customEnd ? format(customEnd, "dd/MM/yyyy") : "Fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Report type selector */}
            <div className="flex flex-wrap gap-2">
              {REPORT_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  variant={reportType === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setReportType(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {/* Save button */}
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={updateReport.isPending}>
                <Save className="h-3 w-3 mr-1" />
                Salvar configuração
              </Button>
            </div>

            {/* Report table */}
            <ReportContent
              reportType={reportType}
              periodPreset={periodPreset}
              customStart={periodPreset === "custom" && customStart ? format(customStart, "yyyy-MM-dd") : null}
              customEnd={periodPreset === "custom" && customEnd ? format(customEnd, "yyyy-MM-dd") : null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
