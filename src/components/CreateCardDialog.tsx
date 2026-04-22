import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateCards, useKanbanData, useKanbanTags } from "@/hooks/useKanbanData";
import { parseCardInput } from "@/hooks/useKanbanData";
import { toast } from "sonner";

interface CreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCardDialog({ open, onOpenChange }: CreateCardDialogProps) {
  const [singleCode, setSingleCode] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [exceptions, setExceptions] = useState("");
  const [multiCodes, setMultiCodes] = useState("");
  const [multiExceptions, setMultiExceptions] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [multiSelectedTags, setMultiSelectedTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [multiTagPopoverOpen, setMultiTagPopoverOpen] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    duplicates: string[];
    proceed: () => void;
  } | null>(null);

  const createCards = useCreateCards();
  const { data: phases } = useKanbanData();
  const { data: allTags } = useKanbanTags();

  const existingCodes = useMemo(() => {
    const set = new Set<string>();
    phases?.forEach((p) => p.cards.forEach((c) => set.add(c.code.toUpperCase())));
    return set;
  }, [phases]);

  const resetSingle = () => {
    setSingleCode("");
    setDriveLink("");
    setExceptions("");
    setSelectedTags([]);
  };

  const resetMulti = () => {
    setMultiCodes("");
    setMultiExceptions("");
    setMultiSelectedTags([]);
  };

  const submitSingle = () => {
    const code = singleCode.trim();
    if (!code) return;
    const link = driveLink.trim();
    const exc = exceptions.trim();
    createCards.mutate(
      [{ raw: code, driveLinks: link ? [link] : [], exceptions: exc, tags: selectedTags }],
      {
        onSuccess: () => {
          toast.success("Card criado com sucesso!");
          resetSingle();
          onOpenChange(false);
        },
        onError: () => toast.error("Erro ao criar card."),
      }
    );
  };

  const handleCreateSingle = () => {
    const code = singleCode.trim();
    if (!code) return;
    const { code: parsedCode } = parseCardInput(code);
    if (existingCodes.has(parsedCode.toUpperCase())) {
      setDuplicateConfirm({
        duplicates: [parsedCode],
        proceed: () => {
          setDuplicateConfirm(null);
          submitSingle();
        },
      });
      return;
    }
    submitSingle();
  };

  const submitMultiple = (codes: string[]) => {
    const exc = multiExceptions.trim();
    createCards.mutate(
      codes.map((raw) => ({ raw, driveLinks: [], exceptions: exc, tags: multiSelectedTags })),
      {
        onSuccess: () => {
          toast.success(`${codes.length} card(s) criado(s) com sucesso!`);
          resetMulti();
          onOpenChange(false);
        },
        onError: () => toast.error("Erro ao criar cards."),
      }
    );
  };

  const handleCreateMultiple = () => {
    const codes = multiCodes
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    if (codes.length === 0) return;

    const duplicates = codes.filter((raw) => {
      const { code } = parseCardInput(raw);
      return existingCodes.has(code.toUpperCase());
    });

    if (duplicates.length > 0) {
      setDuplicateConfirm({
        duplicates: duplicates.map((d) => parseCardInput(d).code),
        proceed: () => {
          setDuplicateConfirm(null);
          submitMultiple(codes);
        },
      });
      return;
    }
    submitMultiple(codes);
  };

  const toggleTag = (tagName: string, multi: boolean) => {
    if (multi) {
      setMultiSelectedTags((prev) =>
        prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
      );
    } else {
      setSelectedTags((prev) =>
        prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
      );
    }
  };

  const renderTagSelector = (multi: boolean) => {
    const selected = multi ? multiSelectedTags : selectedTags;
    const popoverOpen = multi ? multiTagPopoverOpen : tagPopoverOpen;
    const setPopoverOpen = multi ? setMultiTagPopoverOpen : setTagPopoverOpen;

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          {selected.map((tagName) => {
            const tag = allTags?.find((t) => t.name === tagName);
            return (
              <Badge
                key={tagName}
                style={{ backgroundColor: tag?.color || "#6b7280", color: "white" }}
                className="gap-1 pr-1"
              >
                {tagName}
                <button
                  type="button"
                  onClick={() => toggleTag(tagName, multi)}
                  className="hover:bg-white/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1">
                <Plus className="h-3 w-3" /> Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {allTags && allTags.length > 0 ? (
                  allTags.map((tag) => {
                    const isSel = selected.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name, multi)}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent text-left",
                          isSel && "bg-accent"
                        )}
                      >
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 truncate">{tag.name}</span>
                        {isSel && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Nenhuma tag cadastrada.
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar novo card</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Código único</TabsTrigger>
              <TabsTrigger value="multiple">Múltiplos códigos</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4 pt-2">
              <Input
                placeholder="Ex: LAU0050 ou 16/2HFO1001"
                value={singleCode}
                onChange={(e) => setSingleCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateSingle()}
              />
              <Input
                placeholder="Link do Drive (opcional)"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
              />
              <Textarea
                placeholder="Exceções (opcional)"
                value={exceptions}
                onChange={(e) => setExceptions(e.target.value)}
                rows={3}
              />
              {renderTagSelector(false)}
              <p className="text-[10px] text-muted-foreground">
                Formato com data: <span className="font-mono">16/2HFO1001</span> → código HFO1001, enviado dia 16/02
              </p>
              <DialogFooter>
                <Button onClick={handleCreateSingle} disabled={!singleCode.trim() || createCards.isPending}>
                  Criar card
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="multiple" className="space-y-4 pt-2">
              <Textarea
                placeholder={"Um código por linha:\nLAU0012\n16/2HFO1001\n20/3ABC0050"}
                value={multiCodes}
                onChange={(e) => setMultiCodes(e.target.value)}
                rows={6}
              />
              <Textarea
                placeholder="Exceções (opcional, aplicadas a todos os cards)"
                value={multiExceptions}
                onChange={(e) => setMultiExceptions(e.target.value)}
                rows={3}
              />
              {renderTagSelector(true)}
              <p className="text-xs text-muted-foreground">
                {multiCodes.split("\n").filter((l) => l.trim()).length} card(s) serão criados na Fase 0.
              </p>
              <DialogFooter>
                <Button
                  onClick={handleCreateMultiple}
                  disabled={!multiCodes.trim() || createCards.isPending}
                >
                  Criar cards
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!duplicateConfirm}
        onOpenChange={(o) => !o && setDuplicateConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Código duplicado</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateConfirm && duplicateConfirm.duplicates.length === 1 ? (
                <>
                  O código <span className="font-mono font-semibold">{duplicateConfirm.duplicates[0]}</span> já foi adicionado. Deseja continuar?
                </>
              ) : (
                <>
                  Os seguintes códigos já foram adicionados:{" "}
                  <span className="font-mono font-semibold">
                    {duplicateConfirm?.duplicates.join(", ")}
                  </span>
                  . Deseja continuar?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => duplicateConfirm?.proceed()}>
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
