import { useState, useEffect, useMemo } from "react";
import { useSavedReports, useCreateSavedReport, useUpdateSavedReport, useDeleteSavedReport, type SavedReport } from "@/hooks/useSavedReports";
import { useKanbanData, useResponsiblePeople } from "@/hooks/useKanbanData";
import { ReportContent } from "./ReportContent";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CalendarIcon, Pencil, Trash2, Save, Check, X, FileText, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type PeriodPreset = "hoje" | "7dias" | "30dias" | "custom" | "";
type VariableType = "responsavel_atualizacao" | "responsavel" | "tag" | "sapron";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "Últimos 7 dias" },
  { value: "30dias", label: "Últimos 30 dias" },
  { value: "custom", label: "Personalizado" },
];

const VARIABLE_OPTIONS: { value: VariableType; label: string }[] = [
  { value: "responsavel_atualizacao", label: "Responsável pela atualização de laudo" },
  { value: "responsavel", label: "Responsável" },
  { value: "tag", label: "Tag" },
  { value: "sapron", label: "Laudo adicionado na Sapron" },
];

export function KanbanReports() {
  const { data: savedReports, isLoading } = useSavedReports();
  const createReport = useCreateSavedReport();
  const updateReport = useUpdateSavedReport();
  const deleteReport = useDeleteSavedReport();
  const { data: phases } = useKanbanData();
  const { data: people } = useResponsiblePeople();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // Filter state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [selectedVariable, setSelectedVariable] = useState<VariableType | "">("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [selectedPhases, setSelectedPhases] = useState<number[]>([]);

  // Dropdown open states
  const [variableDropdownOpen, setVariableDropdownOpen] = useState(false);
  const [valuesDropdownOpen, setValuesDropdownOpen] = useState(false);
  const [phaseDropdownOpen, setPhaseDropdownOpen] = useState(false);

  // Don't auto-select any report on load

  const loadReport = (report: SavedReport) => {
    setSelectedReportId(report.id);
    setPeriodPreset((report.period_preset || "") as PeriodPreset);
    setCustomStart(report.custom_start ? new Date(report.custom_start) : undefined);
    setCustomEnd(report.custom_end ? new Date(report.custom_end) : undefined);
    setSelectedVariable((report.selected_variable || "") as VariableType | "");
    setSelectedValues(report.selected_values ?? []);
    setSelectedPhases(report.selected_phases ?? []);
  };

  // Available values for the selected variable
  const availableValues = useMemo(() => {
    if (!phases) return [];
    const allCards = phases.flatMap(p => p.cards);

    switch (selectedVariable) {
      case "responsavel_atualizacao": {
        const peopleNames = (people ?? []).map(p => p.name);
        const fromCards = [...new Set(allCards.map(c => c.updateResponsible).filter(Boolean))] as string[];
        return [...new Set([...peopleNames, ...fromCards])].sort();
      }
      case "responsavel": {
        const peopleNames = (people ?? []).map(p => p.name);
        const fromCards = [...new Set(allCards.map(c => c.responsible).filter(Boolean))] as string[];
        return [...new Set([...peopleNames, ...fromCards])].sort();
      }
      case "tag": {
        const tags = new Set<string>();
        allCards.forEach(c => (c.tags ?? []).forEach(t => tags.add(t)));
        return [...tags].sort();
      }
      case "sapron":
        return ["sim", "nao"];
      default:
        return [];
    }
  }, [selectedVariable, phases, people]);

  const valueLabelMap: Record<string, string> = { sim: "Marcado na Sapron", nao: "Não marcado na Sapron" };

  const toggleValue = (val: string) => {
    setSelectedValues(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const togglePhase = (phaseId: number) => {
    setSelectedPhases(prev => prev.includes(phaseId) ? prev.filter(p => p !== phaseId) : [...prev, phaseId]);
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
        period_preset: periodPreset,
        custom_start: periodPreset === "custom" && customStart ? format(customStart, "yyyy-MM-dd") : null,
        custom_end: periodPreset === "custom" && customEnd ? format(customEnd, "yyyy-MM-dd") : null,
        selected_variable: selectedVariable || null,
        selected_values: selectedValues,
        selected_phases: selectedPhases,
      },
    }, {
      onSuccess: () => toast.success("Relatório salvo!"),
      onError: () => toast.error("Erro ao salvar."),
    });
  };

  const handleRename = (id: string) => {
    if (!editingNameValue.trim()) return;
    updateReport.mutate({ id, updates: { name: editingNameValue.trim() } }, {
      onSuccess: () => { setEditingNameId(null); toast.success("Renomeado!"); },
    });
  };

  const handleDelete = (id: string) => {
    deleteReport.mutate(id, {
      onSuccess: () => {
        if (selectedReportId === id) setSelectedReportId(null);
        toast.success("Relatório excluído!");
      },
      onError: () => toast.error("Erro ao excluir."),
    });
  };

  const selectedReport = savedReports?.find(r => r.id === selectedReportId);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
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
                onClick={() => selectedReportId === report.id ? setSelectedReportId(null) : loadReport(report)}
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
                      <button onClick={() => { setEditingNameId(report.id); setEditingNameValue(report.name); }} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDelete(report.id)} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
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
            <p className="text-sm font-medium">Clique em "Criar relatório" para começar</p>
          </div>
        ) : (
          <div className="p-4 space-y-4 max-w-5xl">
            <h2 className="text-lg font-bold text-foreground">{selectedReport.name}</h2>

            {/* Filters row */}
            <div className="flex flex-wrap items-start gap-4">
              {/* 1. Período */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Período</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs w-44 justify-between">
                      {periodPreset ? PERIOD_OPTIONS.find(p => p.value === periodPreset)?.label ?? "Selecionar" : "Selecionar período"}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1" align="start">
                    <div className="space-y-0.5">
                      {PERIOD_OPTIONS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => { setPeriodPreset(p.value); }}
                          className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${periodPreset === p.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {periodPreset === "custom" && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
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
                        <Button variant="outline" size="sm" className="h-7 text-xs">
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

              {/* 2. Variável */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Variável</span>
                <Popover open={variableDropdownOpen} onOpenChange={setVariableDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs w-52 justify-between">
                      {selectedVariable ? VARIABLE_OPTIONS.find(v => v.value === selectedVariable)?.label ?? "Selecionar" : "Selecionar variável"}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-1" align="start">
                    <div className="space-y-0.5">
                      {VARIABLE_OPTIONS.map(v => (
                        <button
                          key={v.value}
                          onClick={() => {
                            setSelectedVariable(v.value);
                            setSelectedValues([]);
                            setVariableDropdownOpen(false);
                          }}
                          className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${selectedVariable === v.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Sub-values selection */}
                {selectedVariable && (
                  <Popover open={valuesDropdownOpen} onOpenChange={setValuesDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs w-52 justify-between mt-1">
                        {selectedValues.length > 0 ? `${selectedValues.length} selecionado(s)` : "Selecionar valores"}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 max-h-60 overflow-y-auto" align="start">
                      <div className="space-y-1">
                        {availableValues.map(val => (
                          <label key={val} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted rounded px-1.5 py-1">
                            <Checkbox
                              checked={selectedValues.includes(val)}
                              onCheckedChange={() => toggleValue(val)}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-foreground">{valueLabelMap[val] ?? val}</span>
                          </label>
                        ))}
                        {availableValues.length === 0 && (
                          <p className="text-xs text-muted-foreground py-2 text-center">Nenhum valor disponível</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* 3. Fase */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fase</span>
                <Popover open={phaseDropdownOpen} onOpenChange={setPhaseDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs w-44 justify-between">
                      {selectedPhases.length > 0 ? `${selectedPhases.length} fase(s)` : "Todas as fases"}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto" align="start">
                    <div className="space-y-1">
                      {(phases ?? []).map(phase => (
                        <label key={phase.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted rounded px-1.5 py-1">
                          <Checkbox
                            checked={selectedPhases.includes(phase.id)}
                            onCheckedChange={() => togglePhase(phase.id)}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-foreground">{phase.title}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Save button */}
            <div>
              <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={updateReport.isPending}>
                <Save className="h-3 w-3 mr-1" />
                Salvar configuração
              </Button>
            </div>

            {/* Results */}
            <ReportContent
              periodPreset={periodPreset}
              customStart={periodPreset === "custom" && customStart ? format(customStart, "yyyy-MM-dd") : null}
              customEnd={periodPreset === "custom" && customEnd ? format(customEnd, "yyyy-MM-dd") : null}
              selectedVariable={selectedVariable || null}
              selectedValues={selectedValues}
              selectedPhases={selectedPhases}
            />
          </div>
        )}
      </div>
    </div>
  );
}
