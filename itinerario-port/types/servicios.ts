// Tipos para Servicios Únicos y Consorcios (desde ASLI)

export type ServicioUnico = {
  id: string;
  nombre: string;
  naviera_id: string;
  naviera_nombre?: string;
  descripcion: string | null;
  puerto_origen: string | null;
  activo: boolean;
  naves?: { id: string; nave_nombre: string; orden: number }[];
  destinos?: ServicioUnicoDestino[];
};

export type ServicioUnicoDestino = {
  id: string;
  puerto: string;
  puerto_nombre: string | null;
  area: string;
  orden: number;
};

export type Consorcio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  requiere_revision?: boolean;
  servicios?: ConsorcioServicio[];
  destinos_activos?: { id: string; destino_id: string; servicio_unico_id: string; destino?: ServicioUnicoDestino; orden: number }[];
};

export type ConsorcioServicio = {
  id: string;
  servicio_unico_id: string;
  servicio_unico?: ServicioUnico;
  orden: number;
};

export type ServicioUnicoFormData = {
  nombre: string;
  naviera_id: string;
  descripcion: string;
  puerto_origen: string;
  naves: string[];
  destinos: Array<{ puerto: string; puerto_nombre: string; area: string; orden: number }>;
};

export type ConsorcioFormData = {
  nombre: string;
  descripcion: string;
  servicios_unicos: Array<{
    servicio_unico_id: string;
    orden: number;
    destinos_activos?: Array<{ destino_id: string; orden: number }>;
  }>;
};
