-- Agregar campo cliente a formatos_documentos
-- null = formato global (visible para todos)
-- valor = formato exclusivo de ese cliente

ALTER TABLE formatos_documentos
  ADD COLUMN IF NOT EXISTS cliente TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_formatos_documentos_cliente
  ON formatos_documentos(cliente);

COMMENT ON COLUMN formatos_documentos.cliente IS
  'Nombre del cliente al que pertenece este formato. NULL = formato global.';

-- Verificacion
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'formatos_documentos' AND column_name = 'cliente';
