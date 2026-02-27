-- Tabla clientes para EMBARQUES
-- Campos: nombre_cliente, contacto, usuario (FK futura a usuarios), rut_empresa, giro
-- La relación con usuarios (muchos a muchos) se agregará cuando exista la tabla usuarios

CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_cliente text NOT NULL,
  contacto text,
  rut_empresa text,
  giro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes (nombre_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_rut ON public.clientes (rut_empresa);

-- RLS: habilitar políticas según necesidad del proyecto
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Política básica: permitir operaciones (ajustar según autenticación del proyecto)
CREATE POLICY "Allow all clientes" ON public.clientes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clientes_updated_at ON public.clientes;
CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
