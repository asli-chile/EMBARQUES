import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

type SampleRow = Record<string, string>;

const COLS: { key: string; labelKey: string }[] = [
  { key: "ref_asli", labelKey: "colRefAsli" },
  { key: "cliente", labelKey: "colClient" },
  { key: "transporte", labelKey: "transportCompany" },
  { key: "chofer", labelKey: "driverName" },
  { key: "rut_chofer", labelKey: "driverRut" },
  { key: "telefono_chofer", labelKey: "driverPhone" },
  { key: "patente_camion", labelKey: "truckPlate" },
  { key: "patente_remolque", labelKey: "trailerPlate" },
  { key: "contenedor", labelKey: "container" },
  { key: "sello", labelKey: "seal" },
  { key: "tara", labelKey: "tare" },
  { key: "deposito", labelKey: "warehouse" },
  { key: "citacion", labelKey: "citation" },
  { key: "llegada_planta", labelKey: "plantArrival" },
  { key: "salida_planta", labelKey: "plantDeparture" },
  { key: "agendamiento_retiro", labelKey: "pickupSchedule" },
  { key: "inicio_stacking", labelKey: "stackingStart" },
  { key: "fin_stacking", labelKey: "stackingEnd" },
  { key: "ingreso_stacking", labelKey: "stackingEntry" },
  { key: "tramo", labelKey: "section" },
  { key: "valor_tramo", labelKey: "sectionValue" },
  { key: "observaciones", labelKey: "observations" },
];

const SAMPLE_ROWS: SampleRow[] = [
  {
    ref_asli: "A07015",
    cliente: "Exportadora Sur",
    transporte: "Transportes Norte",
    chofer: "Juan Pérez",
    rut_chofer: "12.345.678-9",
    telefono_chofer: "+56 9 1234 5678",
    patente_camion: "RST-123",
    patente_remolque: "XYZ-456",
    contenedor: "OTPU683204",
    sello: "S001",
    tara: "2500",
    deposito: "Dep. San Antonio",
    citacion: "06/02 08:00",
    llegada_planta: "06/02 09:15",
    salida_planta: "06/02 14:30",
    agendamiento_retiro: "07/02 10:00",
    inicio_stacking: "06/02 10:00",
    fin_stacking: "06/02 14:00",
    ingreso_stacking: "06/02 10:05",
    tramo: "Planta-Depósito",
    valor_tramo: "85.000",
    observaciones: "Carga refrigerada",
  },
  {
    ref_asli: "A07016",
    cliente: "Agrícola Valle",
    transporte: "Logística Centro",
    chofer: "Carlos Soto",
    rut_chofer: "98.765.432-1",
    telefono_chofer: "+56 9 8765 4321",
    patente_camion: "ABC-789",
    patente_remolque: "DEF-012",
    contenedor: "SEGU982106",
    sello: "S002",
    tara: "2600",
    deposito: "Dep. Valparaíso",
    citacion: "07/02 07:30",
    llegada_planta: "07/02 08:45",
    salida_planta: "07/02 13:20",
    agendamiento_retiro: "08/02 09:00",
    inicio_stacking: "07/02 09:00",
    fin_stacking: "07/02 12:45",
    ingreso_stacking: "07/02 09:10",
    tramo: "Planta-Puerto",
    valor_tramo: "120.000",
    observaciones: "",
  },
  {
    ref_asli: "A07017",
    cliente: "Frutas Premium",
    transporte: "—",
    chofer: "—",
    rut_chofer: "—",
    telefono_chofer: "—",
    patente_camion: "—",
    patente_remolque: "—",
    contenedor: "—",
    sello: "—",
    tara: "—",
    deposito: "—",
    citacion: "—",
    llegada_planta: "—",
    salida_planta: "—",
    agendamiento_retiro: "—",
    inicio_stacking: "—",
    fin_stacking: "—",
    ingreso_stacking: "—",
    tramo: "—",
    valor_tramo: "—",
    observaciones: "Pendiente asignación",
  },
  {
    ref_asli: "A07018",
    cliente: "Exportadora Sur",
    transporte: "Cargo Express",
    chofer: "Luis Mora",
    rut_chofer: "11.222.333-4",
    telefono_chofer: "+56 9 1111 2222",
    patente_camion: "GHI-345",
    patente_remolque: "JKL-678",
    contenedor: "TEMU975700",
    sello: "S003",
    tara: "2550",
    deposito: "Dep. San Antonio",
    citacion: "08/02 06:00",
    llegada_planta: "08/02 07:20",
    salida_planta: "08/02 12:00",
    agendamiento_retiro: "09/02 08:00",
    inicio_stacking: "08/02 07:30",
    fin_stacking: "08/02 11:45",
    ingreso_stacking: "08/02 07:35",
    tramo: "Depósito-Puerto",
    valor_tramo: "95.000",
    observaciones: "",
  },
  {
    ref_asli: "A07019",
    cliente: "Agrícola Valle",
    transporte: "Transportes Norte",
    chofer: "Pedro Ríos",
    rut_chofer: "55.666.777-8",
    telefono_chofer: "+56 9 5555 6666",
    patente_camion: "MNO-901",
    patente_remolque: "PQR-234",
    contenedor: "ONEU930380",
    sello: "S004",
    tara: "2480",
    deposito: "Dep. Valparaíso",
    citacion: "09/02 08:30",
    llegada_planta: "09/02 09:45",
    salida_planta: "09/02 15:00",
    agendamiento_retiro: "10/02 09:30",
    inicio_stacking: "09/02 10:00",
    fin_stacking: "09/02 14:30",
    ingreso_stacking: "09/02 10:05",
    tramo: "Planta-Depósito",
    valor_tramo: "88.000",
    observaciones: "Rechequeo OK",
  },
  {
    ref_asli: "A07020",
    cliente: "Frutas Premium",
    transporte: "Logística Centro",
    chofer: "Ana Silva",
    rut_chofer: "22.333.444-5",
    telefono_chofer: "+56 9 2222 3333",
    patente_camion: "STU-567",
    patente_remolque: "VWX-890",
    contenedor: "MNBU041606",
    sello: "S005",
    tara: "2620",
    deposito: "Dep. San Antonio",
    citacion: "10/02 07:00",
    llegada_planta: "10/02 08:15",
    salida_planta: "10/02 13:45",
    agendamiento_retiro: "11/02 08:00",
    inicio_stacking: "10/02 08:30",
    fin_stacking: "10/02 13:15",
    ingreso_stacking: "10/02 08:35",
    tramo: "Planta-Puerto",
    valor_tramo: "125.000",
    observaciones: "",
  },
  {
    ref_asli: "A07021",
    cliente: "Exportadora Sur",
    transporte: "—",
    chofer: "—",
    rut_chofer: "—",
    telefono_chofer: "—",
    patente_camion: "—",
    patente_remolque: "—",
    contenedor: "—",
    sello: "—",
    tara: "—",
    deposito: "—",
    citacion: "—",
    llegada_planta: "—",
    salida_planta: "—",
    agendamiento_retiro: "—",
    inicio_stacking: "—",
    fin_stacking: "—",
    ingreso_stacking: "—",
    tramo: "—",
    valor_tramo: "—",
    observaciones: "Pendiente",
  },
  {
    ref_asli: "A07022",
    cliente: "Agrícola Valle",
    transporte: "Cargo Express",
    chofer: "Roberto Díaz",
    rut_chofer: "33.444.555-6",
    telefono_chofer: "+56 9 3333 4444",
    patente_camion: "YZA-123",
    patente_remolque: "BCD-456",
    contenedor: "FSCU592501",
    sello: "S006",
    tara: "2510",
    deposito: "Dep. Valparaíso",
    citacion: "11/02 09:00",
    llegada_planta: "11/02 10:30",
    salida_planta: "11/02 14:15",
    agendamiento_retiro: "12/02 10:00",
    inicio_stacking: "11/02 10:45",
    fin_stacking: "11/02 13:50",
    ingreso_stacking: "11/02 10:50",
    tramo: "Planta-Depósito",
    valor_tramo: "82.000",
    observaciones: "",
  },
  {
    ref_asli: "A07023",
    cliente: "Frutas Premium",
    transporte: "Transportes Norte",
    chofer: "María López",
    rut_chofer: "66.777.888-9",
    telefono_chofer: "+56 9 6666 7777",
    patente_camion: "EFG-789",
    patente_remolque: "HIJ-012",
    contenedor: "FBIU536010",
    sello: "S007",
    tara: "2590",
    deposito: "Dep. San Antonio",
    citacion: "12/02 07:30",
    llegada_planta: "12/02 08:50",
    salida_planta: "12/02 13:00",
    agendamiento_retiro: "13/02 09:00",
    inicio_stacking: "12/02 09:15",
    fin_stacking: "12/02 12:30",
    ingreso_stacking: "12/02 09:20",
    tramo: "Depósito-Puerto",
    valor_tramo: "98.000",
    observaciones: "Carga especial",
  },
  {
    ref_asli: "A07024",
    cliente: "Exportadora Sur",
    transporte: "Logística Centro",
    chofer: "Diego Castro",
    rut_chofer: "77.888.999-0",
    telefono_chofer: "+56 9 7777 8888",
    patente_camion: "KLM-345",
    patente_remolque: "NOP-678",
    contenedor: "MSDU984405",
    sello: "S008",
    tara: "2570",
    deposito: "Dep. Valparaíso",
    citacion: "13/02 08:00",
    llegada_planta: "13/02 09:10",
    salida_planta: "13/02 14:45",
    agendamiento_retiro: "14/02 09:30",
    inicio_stacking: "13/02 09:25",
    fin_stacking: "13/02 14:15",
    ingreso_stacking: "13/02 09:30",
    tramo: "Planta-Puerto",
    valor_tramo: "118.000",
    observaciones: "",
  },
  {
    ref_asli: "A07025",
    cliente: "Frutas Premium",
    transporte: "Cargo Express",
    chofer: "Ricardo Vargas",
    rut_chofer: "88.999.000-1",
    telefono_chofer: "+56 9 8888 9999",
    patente_camion: "QRS-901",
    patente_remolque: "TUV-234",
    contenedor: "OLBU223309",
    sello: "S009",
    tara: "2530",
    deposito: "Dep. San Antonio",
    citacion: "14/02 07:00",
    llegada_planta: "14/02 08:20",
    salida_planta: "14/02 12:45",
    agendamiento_retiro: "15/02 08:30",
    inicio_stacking: "14/02 08:45",
    fin_stacking: "14/02 12:15",
    ingreso_stacking: "14/02 08:50",
    tramo: "Planta-Depósito",
    valor_tramo: "90.000",
    observaciones: "",
  },
  {
    ref_asli: "A07026",
    cliente: "Exportadora Sur",
    transporte: "Transportes Norte",
    chofer: "Fernando Ruiz",
    rut_chofer: "99.000.111-2",
    telefono_chofer: "+56 9 9999 0000",
    patente_camion: "WXY-567",
    patente_remolque: "ZAB-890",
    contenedor: "HLCU421107",
    sello: "S010",
    tara: "2610",
    deposito: "Dep. Valparaíso",
    citacion: "15/02 08:30",
    llegada_planta: "15/02 09:55",
    salida_planta: "15/02 14:20",
    agendamiento_retiro: "16/02 09:00",
    inicio_stacking: "15/02 10:15",
    fin_stacking: "15/02 13:55",
    ingreso_stacking: "15/02 10:20",
    tramo: "Depósito-Puerto",
    valor_tramo: "105.000",
    observaciones: "Prioridad",
  },
  {
    ref_asli: "A07027",
    cliente: "Agrícola Valle",
    transporte: "—",
    chofer: "—",
    rut_chofer: "—",
    telefono_chofer: "—",
    patente_camion: "—",
    patente_remolque: "—",
    contenedor: "—",
    sello: "—",
    tara: "—",
    deposito: "—",
    citacion: "—",
    llegada_planta: "—",
    salida_planta: "—",
    agendamiento_retiro: "—",
    inicio_stacking: "—",
    fin_stacking: "—",
    ingreso_stacking: "—",
    tramo: "—",
    valor_tramo: "—",
    observaciones: "Por confirmar",
  },
  {
    ref_asli: "A07028",
    cliente: "Frutas Premium",
    transporte: "Logística Centro",
    chofer: "Andrés Muñoz",
    rut_chofer: "10.111.222-3",
    telefono_chofer: "+56 9 1010 1111",
    patente_camion: "CDE-345",
    patente_remolque: "FGH-678",
    contenedor: "MSCU753802",
    sello: "S011",
    tara: "2490",
    deposito: "Dep. San Antonio",
    citacion: "16/02 06:30",
    llegada_planta: "16/02 07:40",
    salida_planta: "16/02 11:30",
    agendamiento_retiro: "17/02 07:30",
    inicio_stacking: "16/02 08:00",
    fin_stacking: "16/02 11:00",
    ingreso_stacking: "16/02 08:05",
    tramo: "Planta-Puerto",
    valor_tramo: "115.000",
    observaciones: "",
  },
  {
    ref_asli: "A07029",
    cliente: "Exportadora Sur",
    transporte: "Cargo Express",
    chofer: "Pablo González",
    rut_chofer: "11.222.333-4",
    telefono_chofer: "+56 9 1212 1313",
    patente_camion: "IJK-012",
    patente_remolque: "LMN-345",
    contenedor: "HCLU918204",
    sello: "S012",
    tara: "2560",
    deposito: "Dep. Valparaíso",
    citacion: "17/02 09:00",
    llegada_planta: "17/02 10:25",
    salida_planta: "17/02 15:10",
    agendamiento_retiro: "18/02 10:00",
    inicio_stacking: "17/02 10:40",
    fin_stacking: "17/02 14:45",
    ingreso_stacking: "17/02 10:45",
    tramo: "Planta-Depósito",
    valor_tramo: "86.000",
    observaciones: "",
  },
  {
    ref_asli: "A07030",
    cliente: "Agrícola Valle",
    transporte: "Transportes Norte",
    chofer: "Martín Torres",
    rut_chofer: "12.333.444-5",
    telefono_chofer: "+56 9 1313 1414",
    patente_camion: "OPQ-456",
    patente_remolque: "RST-789",
    contenedor: "ONEU112233",
    sello: "S013",
    tara: "2480",
    deposito: "Dep. San Antonio",
    citacion: "18/02 07:30",
    llegada_planta: "18/02 08:45",
    salida_planta: "18/02 13:00",
    agendamiento_retiro: "19/02 09:00",
    inicio_stacking: "18/02 09:15",
    fin_stacking: "18/02 12:30",
    ingreso_stacking: "18/02 09:20",
    tramo: "Depósito-Puerto",
    valor_tramo: "97.000",
    observaciones: "",
  },
  {
    ref_asli: "A07031",
    cliente: "Frutas Premium",
    transporte: "—",
    chofer: "—",
    rut_chofer: "—",
    telefono_chofer: "—",
    patente_camion: "—",
    patente_remolque: "—",
    contenedor: "—",
    sello: "—",
    tara: "—",
    deposito: "—",
    citacion: "—",
    llegada_planta: "—",
    salida_planta: "—",
    agendamiento_retiro: "—",
    inicio_stacking: "—",
    fin_stacking: "—",
    ingreso_stacking: "—",
    tramo: "—",
    valor_tramo: "—",
    observaciones: "En espera",
  },
  {
    ref_asli: "A07032",
    cliente: "Exportadora Sur",
    transporte: "Logística Centro",
    chofer: "Gabriel Reyes",
    rut_chofer: "13.444.555-6",
    telefono_chofer: "+56 9 1414 1515",
    patente_camion: "UVW-789",
    patente_remolque: "XYZ-012",
    contenedor: "HLCU445566",
    sello: "S014",
    tara: "2620",
    deposito: "Dep. Valparaíso",
    citacion: "19/02 08:00",
    llegada_planta: "19/02 09:20",
    salida_planta: "19/02 14:00",
    agendamiento_retiro: "20/02 09:30",
    inicio_stacking: "19/02 09:45",
    fin_stacking: "19/02 13:30",
    ingreso_stacking: "19/02 09:50",
    tramo: "Planta-Puerto",
    valor_tramo: "122.000",
    observaciones: "",
  },
  {
    ref_asli: "A07033",
    cliente: "Agrícola Valle",
    transporte: "Cargo Express",
    chofer: "Nicolás Fernández",
    rut_chofer: "14.555.666-7",
    telefono_chofer: "+56 9 1515 1616",
    patente_camion: "ABC-123",
    patente_remolque: "DEF-456",
    contenedor: "MSCU778899",
    sello: "S015",
    tara: "2510",
    deposito: "Dep. San Antonio",
    citacion: "20/02 06:30",
    llegada_planta: "20/02 07:50",
    salida_planta: "20/02 12:15",
    agendamiento_retiro: "21/02 08:00",
    inicio_stacking: "20/02 08:15",
    fin_stacking: "20/02 11:45",
    ingreso_stacking: "20/02 08:20",
    tramo: "Planta-Depósito",
    valor_tramo: "84.000",
    observaciones: "",
  },
  {
    ref_asli: "A07034",
    cliente: "Frutas Premium",
    transporte: "Transportes Norte",
    chofer: "Sebastián Vega",
    rut_chofer: "15.666.777-8",
    telefono_chofer: "+56 9 1616 1717",
    patente_camion: "GHI-789",
    patente_remolque: "JKL-012",
    contenedor: "TEMU334455",
    sello: "S016",
    tara: "2590",
    deposito: "Dep. Valparaíso",
    citacion: "21/02 09:00",
    llegada_planta: "21/02 10:15",
    salida_planta: "21/02 15:30",
    agendamiento_retiro: "22/02 10:00",
    inicio_stacking: "21/02 10:30",
    fin_stacking: "21/02 14:50",
    ingreso_stacking: "21/02 10:35",
    tramo: "Depósito-Puerto",
    valor_tramo: "103.000",
    observaciones: "Carga refrigerada",
  },
  {
    ref_asli: "A07035",
    cliente: "Exportadora Sur",
    transporte: "Logística Centro",
    chofer: "Felipe Jara",
    rut_chofer: "16.777.888-9",
    telefono_chofer: "+56 9 1717 1818",
    patente_camion: "MNO-345",
    patente_remolque: "PQR-678",
    contenedor: "FSCU667788",
    sello: "S017",
    tara: "2540",
    deposito: "Dep. San Antonio",
    citacion: "22/02 07:00",
    llegada_planta: "22/02 08:25",
    salida_planta: "22/02 13:20",
    agendamiento_retiro: "23/02 08:30",
    inicio_stacking: "22/02 08:50",
    fin_stacking: "22/02 12:45",
    ingreso_stacking: "22/02 08:55",
    tramo: "Planta-Puerto",
    valor_tramo: "116.000",
    observaciones: "",
  },
  {
    ref_asli: "A07036",
    cliente: "Agrícola Valle",
    transporte: "—",
    chofer: "—",
    rut_chofer: "—",
    telefono_chofer: "—",
    patente_camion: "—",
    patente_remolque: "—",
    contenedor: "—",
    sello: "—",
    tara: "—",
    deposito: "—",
    citacion: "—",
    llegada_planta: "—",
    salida_planta: "—",
    agendamiento_retiro: "—",
    inicio_stacking: "—",
    fin_stacking: "—",
    ingreso_stacking: "—",
    tramo: "—",
    valor_tramo: "—",
    observaciones: "Por asignar",
  },
  {
    ref_asli: "A07037",
    cliente: "Frutas Premium",
    transporte: "Cargo Express",
    chofer: "Rodrigo Sandoval",
    rut_chofer: "17.888.999-0",
    telefono_chofer: "+56 9 1818 1919",
    patente_camion: "STU-567",
    patente_remolque: "VWX-890",
    contenedor: "OLBU990011",
    sello: "S018",
    tara: "2470",
    deposito: "Dep. Valparaíso",
    citacion: "23/02 08:30",
    llegada_planta: "23/02 09:50",
    salida_planta: "23/02 14:10",
    agendamiento_retiro: "24/02 09:00",
    inicio_stacking: "23/02 10:05",
    fin_stacking: "23/02 13:40",
    ingreso_stacking: "23/02 10:10",
    tramo: "Planta-Depósito",
    valor_tramo: "91.000",
    observaciones: "",
  },
  {
    ref_asli: "A07038",
    cliente: "Exportadora Sur",
    transporte: "Transportes Norte",
    chofer: "Cristián Bravo",
    rut_chofer: "18.999.000-1",
    telefono_chofer: "+56 9 1919 2020",
    patente_camion: "YZA-901",
    patente_remolque: "BCD-234",
    contenedor: "HCLU223344",
    sello: "S019",
    tara: "2610",
    deposito: "Dep. San Antonio",
    citacion: "24/02 07:30",
    llegada_planta: "24/02 08:40",
    salida_planta: "24/02 12:50",
    agendamiento_retiro: "25/02 08:00",
    inicio_stacking: "24/02 09:00",
    fin_stacking: "24/02 12:20",
    ingreso_stacking: "24/02 09:05",
    tramo: "Depósito-Puerto",
    valor_tramo: "106.000",
    observaciones: "",
  },
];

export function ReservaAsliVisitorPreview() {
  const { t } = useLocale();
  const v = t.visitor.reservaAsli;
  const tr = t.transporteAsli;
  const treg = t.registros;
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const posRef = useRef(0);
  const dirRef = useRef(1);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const DURATION_ONE_WAY_MS = 35000;
    const FPS = 90;
    const stepPerMs = 1 / DURATION_ONE_WAY_MS;

    const animate = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const step = maxScroll * stepPerMs * (1000 / FPS) * dirRef.current;
      posRef.current = Math.max(0, Math.min(maxScroll, posRef.current + step));
      el.scrollLeft = posRef.current;

      if (posRef.current >= maxScroll) dirRef.current = -1;
      if (posRef.current <= 0) dirRef.current = 1;

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neutral-50" role="main">
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 gap-3 max-w-[1400px] mx-auto w-full min-w-0 overflow-hidden">
        <div className="flex-shrink-0">
          <VisitorSidebarQuickAccess currentHref="/transportes/reserva-asli" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4 flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="min-h-0 min-w-0 flex">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal p-4 sm:p-5 flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
              <p className="text-sm font-semibold text-brand-teal uppercase tracking-wider mb-1 flex-shrink-0">
                {t.visitor.transportModule}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight leading-tight flex-shrink-0">{v.title}</h1>
              <p className="text-neutral-500 mt-1 text-base leading-snug flex-shrink-0">{v.description}</p>
              <h2 className="text-base font-semibold text-brand-blue mt-4 mb-2 flex-shrink-0">{v.whatYouCanResolve}</h2>
              <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {v.highlight1}
                </div>
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {v.highlight2}
                </div>
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {v.highlight3}
                </div>
                <div className="flex items-start gap-2 text-base text-neutral-600">
                  <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={8} height={8} />
                  {v.highlight4}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-neutral-100 flex-shrink-0">
                <AuthFormTrigger
                  mode="login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-base font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
                >
                  <Icon icon="typcn:key" width={16} height={16} />
                  {t.visitor.moduleCta}
                </AuthFormTrigger>
              </div>
            </div>
          </div>

          <div className="flex flex-col min-h-0 min-w-0">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 flex-shrink-0">
              Vista de muestra — Transportes de nuestras reservas
            </p>
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
                <table className="w-full min-w-[2600px] text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      {COLS.map((c) => {
                        const label =
                          c.labelKey === "colRefAsli"
                            ? treg.colRefAsli
                            : c.labelKey === "colClient"
                              ? treg.colClient
                              : (tr as Record<string, string>)[c.labelKey] ?? c.key;
                        return (
                          <th
                            key={c.key}
                            className="px-2 py-1.5 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap"
                          >
                            {label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((row, i) => (
                      <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80 transition-colors">
                        {COLS.map((c) => (
                          <td key={c.key} className="px-2 py-1.5 text-neutral-700 whitespace-nowrap">
                            {row[c.key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
