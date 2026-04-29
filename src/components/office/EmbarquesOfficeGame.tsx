import { useEffect, useState } from "react";

const GRID_COLS = 20;
const GRID_ROWS = 35;
const COLUMN_LABELS = Array.from({ length: GRID_COLS }, (_, index) => String.fromCharCode(65 + index));
type Segment = {
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
  edge?: "top" | "bottom" | "left" | "right";
};
type AvatarNpc = {
  id: string;
  startCol: number;
  startRow: number;
  variant: "avatar" | "avatarF";
  label: string;
  workArea: {
    colStart: number;
    colEnd: number;
    rowStart: number;
    rowEnd: number;
  };
};
type TaskState = "idle" | "working" | "done";
type NpcRuntime = {
  col: number;
  row: number;
  status: TaskState;
  task: string;
  progress: number;
  cooldown: number;
};

const MEETING_ROOM_SEGMENTS: Segment[] = [
  {
    colStart: 1, // A
    colEnd: 8, // H
    rowStart: 4,
    rowEnd: 4,
    edge: "top",
  },
  {
    colStart: 1, // A
    colEnd: 8, // H
    rowStart: 13,
    rowEnd: 13,
    edge: "bottom",
  },
  {
    colStart: 8, // H
    colEnd: 8, // H
    rowStart: 4,
    rowEnd: 13,
    edge: "right",
  },
  {
    colStart: 1, // A
    colEnd: 4, // D
    rowStart: 20,
    rowEnd: 20,
    edge: "top",
  },
  {
    colStart: 8, // H
    colEnd: 20, // T
    rowStart: 20,
    rowEnd: 20,
    edge: "top",
  },
];
const MEETING_ROOM_2_BOX = {
  colStart: 1, // A
  colEnd: 8, // H
  rowStart: 4,
  rowEnd: 13,
};
const TRANSPORTE_SEGMENTS: Segment[] = [
  {
    colStart: 13, // M
    colEnd: 20, // T
    rowStart: 0,
    rowEnd: 0,
    edge: "top",
  },
  {
    colStart: 13, // M
    colEnd: 20, // T
    rowStart: 8,
    rowEnd: 8,
    edge: "bottom",
  },
  {
    colStart: 13, // M
    colEnd: 13, // M
    rowStart: 0,
    rowEnd: 8,
    edge: "left",
  },
  {
    colStart: 20, // T
    colEnd: 20, // T
    rowStart: 0,
    rowEnd: 8,
    edge: "right",
  },
];
const TRANSPORTE_BOX = {
  colStart: 13, // M
  colEnd: 20, // T
  rowStart: 0,
  rowEnd: 8,
};
const COMERCIO_EXTERIOR_SEGMENTS: Segment[] = [
  {
    colStart: 13, // M
    colEnd: 20, // T
    rowStart: 13,
    rowEnd: 13,
    edge: "bottom",
  },
  {
    colStart: 13, // M
    colEnd: 13, // M
    rowStart: 8,
    rowEnd: 13,
    edge: "left",
  },
  {
    colStart: 20, // T
    colEnd: 20, // T
    rowStart: 8,
    rowEnd: 13,
    edge: "right",
  },
];
const COMERCIO_EXTERIOR_BOX = {
  colStart: 13, // M
  colEnd: 20, // T
  rowStart: 8,
  rowEnd: 13,
};
const CERTIFICACION_OEA_SEGMENTS: Segment[] = [
  {
    colStart: 1, // A
    colEnd: 4, // D
    rowStart: 14,
    rowEnd: 14,
    edge: "top",
  },
  {
    colStart: 1, // A
    colEnd: 4, // D
    rowStart: 16,
    rowEnd: 16,
    edge: "bottom",
  },
  {
    colStart: 1, // A
    colEnd: 1, // A
    rowStart: 14,
    rowEnd: 16,
    edge: "left",
  },
  {
    colStart: 4, // D
    colEnd: 4, // D
    rowStart: 14,
    rowEnd: 16,
    edge: "right",
  },
];
const CERTIFICACION_OEA_BOX = {
  colStart: 1, // A
  colEnd: 4, // D
  rowStart: 14,
  rowEnd: 16,
};
const EJEC_COMERCIAL_ZONA_SUR_SEGMENTS: Segment[] = [
  {
    colStart: 1, // A
    colEnd: 4, // D
    rowStart: 17,
    rowEnd: 17,
    edge: "top",
  },
  {
    colStart: 1, // A
    colEnd: 4, // D
    rowStart: 19,
    rowEnd: 19,
    edge: "bottom",
  },
  {
    colStart: 1, // A
    colEnd: 1, // A
    rowStart: 17,
    rowEnd: 19,
    edge: "left",
  },
  {
    colStart: 4, // D
    colEnd: 4, // D
    rowStart: 17,
    rowEnd: 19,
    edge: "right",
  },
];
const EJEC_COMERCIAL_ZONA_SUR_BOX = {
  colStart: 1, // A
  colEnd: 4, // D
  rowStart: 17,
  rowEnd: 19,
};
const SUBGERENCIA_OPERACIONES_SEGMENTS: Segment[] = [
  {
    colStart: 13, // M
    colEnd: 20, // T
    rowStart: 14,
    rowEnd: 14,
    edge: "top",
  },
  {
    colStart: 13, // M
    colEnd: 20, // T
    rowStart: 19,
    rowEnd: 19,
    edge: "bottom",
  },
  {
    colStart: 13, // M
    colEnd: 13, // M
    rowStart: 14,
    rowEnd: 19,
    edge: "left",
  },
  {
    colStart: 20, // T
    colEnd: 20, // T
    rowStart: 14,
    rowEnd: 19,
    edge: "right",
  },
];
const SUBGERENCIA_OPERACIONES_BOX = {
  colStart: 13, // M
  colEnd: 20, // T
  rowStart: 14,
  rowEnd: 19,
};
const AREA_G16_M19_SEGMENTS: Segment[] = [
  {
    colStart: 8, // H
    colEnd: 12, // L
    rowStart: 16,
    rowEnd: 16,
    edge: "top",
  },
  {
    colStart: 8, // H
    colEnd: 12, // L
    rowStart: 19,
    rowEnd: 19,
    edge: "bottom",
  },
  {
    colStart: 8, // H
    colEnd: 8, // H
    rowStart: 16,
    rowEnd: 19,
    edge: "left",
  },
  {
    colStart: 12, // L
    colEnd: 12, // L
    rowStart: 16,
    rowEnd: 19,
    edge: "right",
  },
];
const CUSTOMER_SYSTEM_BOX = {
  colStart: 8, // H
  colEnd: 12, // L
  rowStart: 16,
  rowEnd: 19,
};
const AREA_A25_H35_SEGMENTS: Segment[] = [
  {
    colStart: 1, // A
    colEnd: 8, // H
    rowStart: 25,
    rowEnd: 25,
    edge: "top",
  },
  {
    colStart: 1, // A
    colEnd: 8, // H
    rowStart: 35,
    rowEnd: 35,
    edge: "bottom",
  },
  {
    colStart: 1, // A
    colEnd: 1, // A
    rowStart: 25,
    rowEnd: 35,
    edge: "left",
  },
  {
    colStart: 8, // H
    colEnd: 8, // H
    rowStart: 25,
    rowEnd: 35,
    edge: "right",
  },
];
const SALA_REUNIONES_1_BOX = {
  colStart: 1, // A
  colEnd: 8, // H
  rowStart: 25,
  rowEnd: 35,
};
const EJEC_OPERACIONES_IMPORTACIONES_SEGMENTS: Segment[] = [
  {
    colStart: 13, // M
    colEnd: 20, // T
    rowStart: 20,
    rowEnd: 20,
    edge: "top",
  },
  {
    colStart: 13, // M
    colEnd: 20, // T
    rowStart: 27,
    rowEnd: 27,
    edge: "bottom",
  },
  {
    colStart: 13, // M
    colEnd: 13, // M
    rowStart: 20,
    rowEnd: 27,
    edge: "left",
  },
  {
    colStart: 20, // T
    colEnd: 20, // T
    rowStart: 20,
    rowEnd: 27,
    edge: "right",
  },
];
const EJEC_OPERACIONES_IMPORTACIONES_BOX = {
  colStart: 13, // M
  colEnd: 20, // T
  rowStart: 20,
  rowEnd: 27,
};
const SUBGERENCIA_ADMIN_FINANZAS_SEGMENTS: Segment[] = [
  {
    colStart: 13, // M
    colEnd: 20, // T
    rowStart: 28,
    rowEnd: 28,
    edge: "top",
  },
  {
    colStart: 13, // M
    colEnd: 20, // T
    rowStart: 35,
    rowEnd: 35,
    edge: "bottom",
  },
  {
    colStart: 13, // M
    colEnd: 13, // M
    rowStart: 28,
    rowEnd: 35,
    edge: "left",
  },
  {
    colStart: 20, // T
    colEnd: 20, // T
    rowStart: 28,
    rowEnd: 35,
    edge: "right",
  },
];
const SUBGERENCIA_ADMIN_FINANZAS_BOX = {
  colStart: 13, // M
  colEnd: 20, // T
  rowStart: 28,
  rowEnd: 35,
};
const AVATAR_NPCS: AvatarNpc[] = [
  {
    id: "npc-transporte",
    startCol: 16,
    startRow: 4,
    variant: "avatar",
    label: "Transporte",
    workArea: { colStart: 13, colEnd: 20, rowStart: 1, rowEnd: 8 },
  },
  {
    id: "npc-comercio",
    startCol: 16,
    startRow: 11,
    variant: "avatar",
    label: "Comercio exterior",
    workArea: { colStart: 13, colEnd: 20, rowStart: 8, rowEnd: 13 },
  },
  {
    id: "npc-oea",
    startCol: 2,
    startRow: 15,
    variant: "avatarF",
    label: "Certificacion OEA",
    workArea: { colStart: 1, colEnd: 4, rowStart: 14, rowEnd: 16 },
  },
  {
    id: "npc-zona-sur",
    startCol: 2,
    startRow: 18,
    variant: "avatar",
    label: "Zona sur",
    workArea: { colStart: 1, colEnd: 4, rowStart: 17, rowEnd: 19 },
  },
  {
    id: "npc-operaciones",
    startCol: 16,
    startRow: 16,
    variant: "avatar",
    label: "Subgerencia operaciones",
    workArea: { colStart: 13, colEnd: 20, rowStart: 14, rowEnd: 19 },
  },
  {
    id: "npc-customer",
    startCol: 10,
    startRow: 17,
    variant: "avatar",
    label: "Customer & system",
    workArea: { colStart: 8, colEnd: 12, rowStart: 16, rowEnd: 19 },
  },
  {
    id: "npc-importaciones",
    startCol: 16,
    startRow: 23,
    variant: "avatarF",
    label: "Operaciones importaciones",
    workArea: { colStart: 13, colEnd: 20, rowStart: 20, rowEnd: 27 },
  },
  {
    id: "npc-finanzas",
    startCol: 16,
    startRow: 31,
    variant: "avatarF",
    label: "Admin y finanzas",
    workArea: { colStart: 13, colEnd: 20, rowStart: 28, rowEnd: 35 },
  },
];
const NPC_TASKS: Record<string, { text: string; points: number }[]> = {
  "npc-transporte": [
    { text: "Asignar camion", points: 8 },
    { text: "Confirmar chofer", points: 10 },
  ],
  "npc-comercio": [
    { text: "Revisar BL", points: 9 },
    { text: "Validar docs cliente", points: 11 },
  ],
  "npc-oea": [
    { text: "Checklist OEA", points: 12 },
    { text: "Auditoria interna", points: 14 },
  ],
  "npc-zona-sur": [
    { text: "Seguimiento cliente", points: 7 },
    { text: "Actualizar estado op", points: 8 },
  ],
  "npc-operaciones": [
    { text: "Coordinar salida", points: 10 },
    { text: "Resolver bloqueo", points: 12 },
  ],
  "npc-customer": [
    { text: "Ticket soporte", points: 9 },
    { text: "Actualizar sistema", points: 13 },
  ],
  "npc-importaciones": [
    { text: "Ingreso aduana", points: 10 },
    { text: "Control documental", points: 11 },
  ],
  "npc-finanzas": [
    { text: "Registrar pago", points: 10 },
    { text: "Conciliar factura", points: 12 },
  ],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function getSegmentStyle(segment: Segment) {
  const isHorizontal = segment.rowStart === segment.rowEnd;
  const isVertical = segment.colStart === segment.colEnd;

  if (isHorizontal) {
    const rowAnchor = segment.edge === "bottom" ? segment.rowEnd : segment.rowStart - 1;
    const safeRowAnchor = Math.max(0, rowAnchor);
    return {
      left: `${((segment.colStart - 1) / GRID_COLS) * 100}%`,
      top: `${(safeRowAnchor / GRID_ROWS) * 100}%`,
      width: `${((segment.colEnd - segment.colStart + 1) / GRID_COLS) * 100}%`,
      height: "2px",
    };
  }

  if (isVertical) {
    const colAnchor = segment.edge === "right" ? segment.colEnd : segment.colStart - 1;
    const safeRowStart = Math.max(0, segment.rowStart - 1);
    return {
      left: `${(colAnchor / GRID_COLS) * 100}%`,
      top: `${(safeRowStart / GRID_ROWS) * 100}%`,
      width: "2px",
      height: `${((segment.rowEnd - segment.rowStart + 1) / GRID_ROWS) * 100}%`,
    };
  }

  return {
    left: `${((segment.colStart - 1) / GRID_COLS) * 100}%`,
    top: `${((segment.rowStart - 1) / GRID_ROWS) * 100}%`,
    width: `${((segment.colEnd - segment.colStart + 1) / GRID_COLS) * 100}%`,
    height: `${((segment.rowEnd - segment.rowStart + 1) / GRID_ROWS) * 100}%`,
  };
}

export default function EmbarquesOfficeGame() {
  const cols = Array.from({ length: GRID_COLS }, (_, index) => index + 1);
  const rows = Array.from({ length: GRID_ROWS }, (_, index) => index + 1);
  const baseUrl = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  const avatarSrc = `${baseUrl}avatar.svg`;
  const avatarFSrc = `${baseUrl}avatar%20f.svg`;
  const [npcRuntime, setNpcRuntime] = useState(() =>
    AVATAR_NPCS.reduce<Record<string, NpcRuntime>>((acc, npc) => {
      acc[npc.id] = {
        col: npc.startCol,
        row: npc.startRow,
        status: "idle",
        task: "En espera",
        progress: 0,
        cooldown: 0,
      };
      return acc;
    }, {}),
  );
  const [score, setScore] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      let earnedPoints = 0;
      let completedInTick = 0;

      setNpcRuntime((current) => {
        const next = { ...current };

        AVATAR_NPCS.forEach((npc) => {
          const actual = next[npc.id] ?? {
            col: npc.startCol,
            row: npc.startRow,
            status: "idle" as TaskState,
            task: "En espera",
            progress: 0,
            cooldown: 0,
          };
          const deltaCol = Math.floor(Math.random() * 3) - 1;
          const deltaRow = Math.floor(Math.random() * 3) - 1;
          const movedCol = clamp(actual.col + deltaCol, npc.workArea.colStart, npc.workArea.colEnd);
          const movedRow = clamp(actual.row + deltaRow, npc.workArea.rowStart, npc.workArea.rowEnd);

          let nextStatus = actual.status;
          let nextTask = actual.task;
          let nextProgress = actual.progress;
          let nextCooldown = actual.cooldown;

          if (actual.status === "idle") {
            if (Math.random() < 0.35) {
              const options = NPC_TASKS[npc.id] ?? [];
              const picked = options[Math.floor(Math.random() * options.length)];
              if (picked) {
                nextStatus = "working";
                nextTask = picked.text;
                nextProgress = 8 + Math.floor(Math.random() * 15);
              }
            }
          } else if (actual.status === "working") {
            nextProgress = Math.min(100, actual.progress + 12 + Math.floor(Math.random() * 20));
            if (nextProgress >= 100) {
              nextStatus = "done";
              nextCooldown = 2;
              completedInTick += 1;
              const points = (NPC_TASKS[npc.id] ?? []).find((task) => task.text === actual.task)?.points ?? 8;
              earnedPoints += points;
            }
          } else if (actual.status === "done") {
            nextCooldown = Math.max(0, actual.cooldown - 1);
            if (nextCooldown === 0) {
              nextStatus = "idle";
              nextTask = "En espera";
              nextProgress = 0;
            }
          }

          next[npc.id] = {
            col: movedCol,
            row: movedRow,
            status: nextStatus,
            task: nextTask,
            progress: nextProgress,
            cooldown: nextCooldown,
          };
        });

        return next;
      });

      if (earnedPoints > 0) setScore((current) => current + earnedPoints);
      if (completedInTick > 0) setCompletedTasks((current) => current + completedInTick);
    }, 900);

    return () => clearInterval(timer);
  }, []);

  const workingCount = Object.values(npcRuntime).filter((npc) => npc.status === "working").length;

  return (
    <section className="h-full w-full overflow-auto bg-[#f7f1e2] p-3 text-[#2d2432] sm:p-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 font-mono tracking-wide">
        <header className="border-4 border-[#2a2026] bg-[#f6d98f] p-3 shadow-[4px_4px_0_0_#2a2026]">
          <h1 className="text-lg font-bold sm:text-xl">Malla Base Oficina</h1>
          <p className="text-xs sm:text-sm">Modo juego activo: cada ejecutivo ejecuta tareas en su zona de trabajo.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase">
            <span className="border-2 border-[#2a2026] bg-[#fff9ec] px-2 py-1">Puntaje: {score}</span>
            <span className="border-2 border-[#2a2026] bg-[#fff9ec] px-2 py-1">Completadas: {completedTasks}</span>
            <span className="border-2 border-[#2a2026] bg-[#fff9ec] px-2 py-1">En curso: {workingCount}</span>
          </div>
        </header>

        <div className="border-4 border-[#2a2026] bg-[#efe6d2] p-2 shadow-[4px_4px_0_0_#2a2026]">
          <div className="mx-auto grid w-full max-w-[640px] grid-cols-[34px_1fr] grid-rows-[24px_1fr] gap-1">
            <div />
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
              {COLUMN_LABELS.map((label) => (
                <span key={`col-${label}`} className="text-center text-[10px] font-bold leading-none text-[#2a2026]">
                  {label}
                </span>
              ))}
            </div>

            <div className="grid gap-0.5" style={{ gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))` }}>
              {rows.map((row) => (
                <span key={`row-${row}`} className="flex items-center justify-end pr-1 text-[9px] font-bold leading-none text-[#2a2026]">
                  {row}
                </span>
              ))}
            </div>

            <div className="office-map relative aspect-[1/2] w-full overflow-hidden border-4 border-[#2a2026] bg-[#efefef]">
              {MEETING_ROOM_SEGMENTS.map((segment) => (
                <div
                  key={`${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {TRANSPORTE_SEGMENTS.map((segment) => (
                <div
                  key={`transporte-${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}-${segment.edge ?? "none"}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {COMERCIO_EXTERIOR_SEGMENTS.map((segment) => (
                <div
                  key={`comercio-exterior-${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}-${segment.edge ?? "none"}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {CERTIFICACION_OEA_SEGMENTS.map((segment) => (
                <div
                  key={`certificacion-oea-${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}-${segment.edge ?? "none"}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {EJEC_COMERCIAL_ZONA_SUR_SEGMENTS.map((segment) => (
                <div
                  key={`zona-sur-${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}-${segment.edge ?? "none"}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {SUBGERENCIA_OPERACIONES_SEGMENTS.map((segment) => (
                <div
                  key={`subgerencia-operaciones-${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}-${segment.edge ?? "none"}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {AREA_G16_M19_SEGMENTS.map((segment) => (
                <div
                  key={`area-g16-m19-${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}-${segment.edge ?? "none"}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {AREA_A25_H35_SEGMENTS.map((segment) => (
                <div
                  key={`area-a25-h35-${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}-${segment.edge ?? "none"}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {EJEC_OPERACIONES_IMPORTACIONES_SEGMENTS.map((segment) => (
                <div
                  key={`ejec-operaciones-importaciones-${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}-${segment.edge ?? "none"}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {SUBGERENCIA_ADMIN_FINANZAS_SEGMENTS.map((segment) => (
                <div
                  key={`subgerencia-admin-finanzas-${segment.colStart}-${segment.rowStart}-${segment.colEnd}-${segment.rowEnd}-${segment.edge ?? "none"}`}
                  className="absolute bg-[#050505]"
                  style={getSegmentStyle(segment)}
                />
              ))}
              {AVATAR_NPCS.map((npc) => (
                <div
                  key={npc.id}
                  className="absolute z-10 transition-all duration-700 ease-linear"
                  style={{
                    left: `${(((npcRuntime[npc.id]?.col ?? npc.startCol) - 0.5) / GRID_COLS) * 100}%`,
                    top: `${(((npcRuntime[npc.id]?.row ?? npc.startRow) - 0.5) / GRID_ROWS) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <img
                    src={npc.variant === "avatarF" ? avatarFSrc : avatarSrc}
                    alt={npc.label}
                    className="h-[120px] w-[120px] object-contain"
                    style={{ imageRendering: "pixelated" }}
                    draggable={false}
                  />
                  <span className="pointer-events-none absolute left-1/2 top-[100%] mt-0.5 -translate-x-1/2 whitespace-nowrap border border-[#2a2026] bg-[#fff9ec] px-1 text-[6px] font-bold uppercase">
                    {npcRuntime[npc.id]?.task ?? "En espera"} {npcRuntime[npc.id]?.status === "working" ? `(${npcRuntime[npc.id]?.progress}%)` : ""}
                  </span>
                </div>
              ))}
              <span
                className="absolute text-[18px] font-extrabold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((MEETING_ROOM_2_BOX.colStart - 1) + (MEETING_ROOM_2_BOX.colEnd - MEETING_ROOM_2_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((MEETING_ROOM_2_BOX.rowStart - 1) + (MEETING_ROOM_2_BOX.rowEnd - MEETING_ROOM_2_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%) rotate(-28deg)",
                  textShadow: "1px 1px 0 #efefef",
                }}
              >
                SALA REUNIONES 2
              </span>
              <span
                className="absolute text-[11px] font-bold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((TRANSPORTE_BOX.colStart - 1) + (TRANSPORTE_BOX.colEnd - TRANSPORTE_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((TRANSPORTE_BOX.rowStart - 1) + (TRANSPORTE_BOX.rowEnd - TRANSPORTE_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                TRANSPORTE
              </span>
              <span
                className="absolute text-[10px] font-bold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((COMERCIO_EXTERIOR_BOX.colStart - 1) + (COMERCIO_EXTERIOR_BOX.colEnd - COMERCIO_EXTERIOR_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((COMERCIO_EXTERIOR_BOX.rowStart - 1) + (COMERCIO_EXTERIOR_BOX.rowEnd - COMERCIO_EXTERIOR_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                COMERCIO EXTERIOR
              </span>
              <span
                className="absolute text-[9px] font-bold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((CERTIFICACION_OEA_BOX.colStart - 1) + (CERTIFICACION_OEA_BOX.colEnd - CERTIFICACION_OEA_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((CERTIFICACION_OEA_BOX.rowStart - 1) + (CERTIFICACION_OEA_BOX.rowEnd - CERTIFICACION_OEA_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                CERTIFICACION OEA
              </span>
              <span
                className="absolute text-[8px] font-bold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((EJEC_COMERCIAL_ZONA_SUR_BOX.colStart - 1) + (EJEC_COMERCIAL_ZONA_SUR_BOX.colEnd - EJEC_COMERCIAL_ZONA_SUR_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((EJEC_COMERCIAL_ZONA_SUR_BOX.rowStart - 1) + (EJEC_COMERCIAL_ZONA_SUR_BOX.rowEnd - EJEC_COMERCIAL_ZONA_SUR_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                EJEC. COMERCIAL
                <br />
                ZONA SUR
              </span>
              <span
                className="absolute text-[8px] font-bold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((SUBGERENCIA_OPERACIONES_BOX.colStart - 1) + (SUBGERENCIA_OPERACIONES_BOX.colEnd - SUBGERENCIA_OPERACIONES_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((SUBGERENCIA_OPERACIONES_BOX.rowStart - 1) + (SUBGERENCIA_OPERACIONES_BOX.rowEnd - SUBGERENCIA_OPERACIONES_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                SUBGERENCIA
                <br />
                OPERACIONES
              </span>
              <span
                className="absolute text-[7px] font-bold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((CUSTOMER_SYSTEM_BOX.colStart - 1) + (CUSTOMER_SYSTEM_BOX.colEnd - CUSTOMER_SYSTEM_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((CUSTOMER_SYSTEM_BOX.rowStart - 1) + (CUSTOMER_SYSTEM_BOX.rowEnd - CUSTOMER_SYSTEM_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                CUSTOMER SERVICES
                <br />
                & SYSTEM DEVOLOPER
              </span>
              <span
                className="absolute text-[10px] font-extrabold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((SALA_REUNIONES_1_BOX.colStart - 1) + (SALA_REUNIONES_1_BOX.colEnd - SALA_REUNIONES_1_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((SALA_REUNIONES_1_BOX.rowStart - 1) + (SALA_REUNIONES_1_BOX.rowEnd - SALA_REUNIONES_1_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%) rotate(-25deg)",
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                SALA DE
                <br />
                REUNIONES 1
              </span>
              <span
                className="absolute text-[7px] font-bold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((EJEC_OPERACIONES_IMPORTACIONES_BOX.colStart - 1) + (EJEC_OPERACIONES_IMPORTACIONES_BOX.colEnd - EJEC_OPERACIONES_IMPORTACIONES_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((EJEC_OPERACIONES_IMPORTACIONES_BOX.rowStart - 1) + (EJEC_OPERACIONES_IMPORTACIONES_BOX.rowEnd - EJEC_OPERACIONES_IMPORTACIONES_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                EJECUTIVO OPERACIONES
                <br />
                IMPORTACIONES
              </span>
              <span
                className="absolute text-[7px] font-bold uppercase tracking-wide text-[#2a2026]"
                style={{
                  left: `${(((SUBGERENCIA_ADMIN_FINANZAS_BOX.colStart - 1) + (SUBGERENCIA_ADMIN_FINANZAS_BOX.colEnd - SUBGERENCIA_ADMIN_FINANZAS_BOX.colStart + 1) / 2) / GRID_COLS) * 100}%`,
                  top: `${(((SUBGERENCIA_ADMIN_FINANZAS_BOX.rowStart - 1) + (SUBGERENCIA_ADMIN_FINANZAS_BOX.rowEnd - SUBGERENCIA_ADMIN_FINANZAS_BOX.rowStart + 1) / 2) / GRID_ROWS) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                SUBGERENTE
                <br />
                ADMINISTRACION
                <br />
                Y FINANZAS
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .office-map {
          image-rendering: pixelated;
          background-image:
            linear-gradient(rgba(78, 64, 45, 0.08) 2px, transparent 2px),
            linear-gradient(90deg, rgba(78, 64, 45, 0.08) 2px, transparent 2px);
          background-size: calc(100% / ${GRID_COLS}) calc(100% / ${GRID_ROWS});
        }
      `}</style>
    </section>
  );
}
