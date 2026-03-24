import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateCards } from "@/hooks/useKanbanData";
import { toast } from "sonner";

interface CreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCardDialog({ open, onOpenChange }: CreateCardDialogProps) {
  const [singleCode, setSingleCode] = useState("");
  const [multiCodes, setMultiCodes] = useState("");
  const createCards = useCreateCards();

  const handleCreateSingle = () => {
    const code = singleCode.trim();
    if (!code) return;
    createCards.mutate([code], {
      onSuccess: () => {
        toast.success("Card criado com sucesso!");
        setSingleCode("");
        onOpenChange(false);
      },
      onError: () => toast.error("Erro ao criar card."),
    });
  };

  const handleCreateMultiple = () => {
    const codes = multiCodes
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    if (codes.length === 0) return;
    createCards.mutate(codes, {
      onSuccess: () => {
        toast.success(`${codes.length} card(s) criado(s) com sucesso!`);
        setMultiCodes("");
        onOpenChange(false);
      },
      onError: () => toast.error("Erro ao criar cards."),
    });
  };

  return (
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
  );
}
