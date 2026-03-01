-- ============================================================================
-- Tabla: documentos
-- Almacena los documentos asociados a cada operación
-- ============================================================================

CREATE TABLE IF NOT EXISTS documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operacion_id UUID NOT NULL REFERENCES operaciones(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tamano INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT tipo_documento_valido CHECK (tipo IN (
    'BOOKING',
    'INSTRUCTIVO_EMBARQUE',
    'FACTURA_GATE_OUT',
    'FACTURA_PROFORMA',
    'CERTIFICADO_FITOSANITARIO',
    'CERTIFICADO_ORIGEN',
    'BL_TELEX_SWB_AWB',
    'FACTURA_COMERCIAL',
    'DUS',
    'FULLSET'
  ))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_operacion ON documentos(operacion_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos(tipo);

-- RLS
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver documentos"
  ON documentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar documentos"
  ON documentos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
  ON documentos FOR DELETE
  TO authenticated
  USING (true);

-- Comentarios
COMMENT ON TABLE documentos IS 'Documentos asociados a operaciones de embarque';
COMMENT ON COLUMN documentos.tipo IS 'Tipo de documento: BOOKING, INSTRUCTIVO_EMBARQUE, etc.';
COMMENT ON COLUMN documentos.url IS 'URL del archivo en Supabase Storage';
