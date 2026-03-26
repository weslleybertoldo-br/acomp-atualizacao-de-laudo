export interface KanbanCard {
  id: string;
  code: string;
  status: "on" | "standby" | "expired";
  statusLabel?: string;
  responsible: string;
  dueDate: string;
  dueLabel: string;
  comments: number;
  attachments: number;
  tags: string[];
  updateResponsible?: string;
  sapronAdded?: boolean;
  driveLinks?: string[];
  createdAt?: string;
}

export interface KanbanPhase {
  id: number;
  title: string;
  cards: KanbanCard[];
}

export const kanbanPhases: KanbanPhase[] = [
  {
    id: 0,
    title: "Fase 0 - Backlog",
    cards: [
      {
        id: "1",
        code: "LAU0001",
        status: "standby",
        statusLabel: "Aguardando",
        responsible: "Maria Silva",
        dueDate: "2026-04-01",
        dueLabel: "Venc abr, 01 · em 8 dias",
        comments: 3,
        attachments: 1,
        tags: ["Laudo Pendente"],
      },
      {
        id: "2",
        code: "LAU0002",
        status: "standby",
        responsible: "João Pereira",
        dueDate: "2026-04-05",
        dueLabel: "Venc abr, 05 · em 12 dias",
        comments: 0,
        attachments: 2,
        tags: [],
      },
    ],
  },
  {
    id: 1,
    title: "Fase 1 - Pendente Atualização",
    cards: [
      {
        id: "3",
        code: "LAU0010",
        status: "on",
        statusLabel: "Ativo",
        responsible: "Ana Costa",
        dueDate: "2026-03-25",
        dueLabel: "Venc mar, 25 · em 1 dia",
        comments: 5,
        attachments: 3,
        tags: ["Revisão de Pendências"],
      },
      {
        id: "4",
        code: "LAU0011",
        status: "expired",
        statusLabel: "Expirado",
        responsible: "Carlos Mendes",
        dueDate: "2026-03-20",
        dueLabel: "Venc mar, 20 · há 4 dias",
        comments: 2,
        attachments: 0,
        tags: ["Urgente"],
      },
      {
        id: "5",
        code: "LAU0012",
        status: "on",
        responsible: "Fernanda Lima",
        dueDate: "2026-03-28",
        dueLabel: "Venc mar, 28 · em 4 dias",
        comments: 1,
        attachments: 1,
        tags: [],
      },
    ],
  },
  {
    id: 2,
    title: "Fase 2 - Atualizando Laudo",
    cards: [
      {
        id: "6",
        code: "LAU0020",
        status: "on",
        statusLabel: "Ativo",
        responsible: "Roberto Alves",
        dueDate: "2026-03-26",
        dueLabel: "Venc mar, 26 · em 2 dias",
        comments: 8,
        attachments: 4,
        tags: ["Vistoria Inicial"],
      },
      {
        id: "7",
        code: "LAU0021",
        status: "on",
        responsible: "Luciana Santos",
        dueDate: "2026-03-30",
        dueLabel: "Venc mar, 30 · em 6 dias",
        comments: 3,
        attachments: 2,
        tags: [],
      },
    ],
  },
  {
    id: 3,
    title: "Fase 3 - Laudos Atualizados",
    cards: [
      {
        id: "8",
        code: "LAU0030",
        status: "on",
        statusLabel: "Concluído",
        responsible: "Thiago Rodrigues",
        dueDate: "2026-03-24",
        dueLabel: "Venc mar, 24 · hoje",
        comments: 12,
        attachments: 5,
        tags: ["Revisão de Pendências"],
      },
      {
        id: "9",
        code: "LAU0031",
        status: "on",
        responsible: "Patricia Campos",
        dueDate: "2026-03-24",
        dueLabel: "Venc mar, 24 · hoje",
        comments: 4,
        attachments: 1,
        tags: ["Vistoria Inicial"],
      },
    ],
  },
  {
    id: 4,
    title: "Fase 4 - Enviados - Concluído",
    cards: [
      {
        id: "10",
        code: "LAU0040",
        status: "on",
        statusLabel: "Finalizado",
        responsible: "Eduardo José",
        dueDate: "2026-03-22",
        dueLabel: "Venc mar, 22 · há 2 dias",
        comments: 9,
        attachments: 2,
        tags: ["Migração"],
      },
      {
        id: "11",
        code: "LAU0041",
        status: "on",
        responsible: "Amanda Souza",
        dueDate: "2026-03-21",
        dueLabel: "Venc mar, 21 · há 3 dias",
        comments: 22,
        attachments: 3,
        tags: ["Vistoria Inicial"],
      },
      {
        id: "12",
        code: "LAU0042",
        status: "on",
        responsible: "Rafael Moreira",
        dueDate: "2026-03-19",
        dueLabel: "Venc mar, 19 · há 5 dias",
        comments: 16,
        attachments: 1,
        tags: [],
      },
    ],
  },
];
