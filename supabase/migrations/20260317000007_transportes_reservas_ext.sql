-- Tabla independiente para reservas de transporte externo
CREATE TABLE IF NOT EXISTS public.transportes_reservas_ext (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos de la operación / contexto
  cliente       text,
  booking       text,
  naviera       text,
  nave          text,
  pod           text,
  etd           date,
  planta_presentacion text,

  -- Transporte
  transporte    text,
  chofer        text,
  rut_chofer    text,
  telefono_chofer text,
  patente_camion text,
  patente_remolque text,

  -- Contenedor
  contenedor    text,
  sello         text,
  tara          numeric,
  deposito      text,

  -- Horarios
  citacion           timestamptz,
  llegada_planta     timestamptz,
  salida_planta      timestamptz,
  agendamiento_retiro timestamptz,

  -- Stacking
  inicio_stacking    timestamptz,
  fin_stacking       timestamptz,
  ingreso_stacking   timestamptz,

  -- Costos
  tramo              text,
  valor_tramo        numeric,
  porteo             text,
  valor_porteo       numeric,
  falso_flete        text,
  valor_falso_flete  numeric,
  factura_transporte text,

  -- General
  observaciones text,
  estado        text NOT NULL DEFAULT 'pendiente',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.transportes_reservas_ext ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth lee transportes_reservas_ext"
  ON public.transportes_reservas_ext FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff gestiona transportes_reservas_ext"
  ON public.transportes_reservas_ext FOR ALL TO authenticated
  USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

-- Grants
GRANT ALL ON public.transportes_reservas_ext TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transportes_reservas_ext TO authenticated;

-- Trigger updated_at
CREATE TRIGGER transportes_reservas_ext_updated_at
  BEFORE UPDATE ON public.transportes_reservas_ext
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
