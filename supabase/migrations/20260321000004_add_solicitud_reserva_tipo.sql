-- Agregar SOLICITUD_RESERVA al CHECK constraint de documentos.tipo
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS tipo_documento_valido;

ALTER TABLE public.documentos
  ADD CONSTRAINT tipo_documento_valido CHECK (tipo IN (
    'BOOKING',
    'INSTRUCTIVO_EMBARQUE',
    'FACTURA_GATE_OUT',
    'FACTURA_PROFORMA',
    'CERTIFICADO_FITOSANITARIO',
    'CERTIFICADO_ORIGEN',
    'BL_TELEX_SWB_AWB',
    'FACTURA_COMERCIAL',
    'DUS',
    'FULLSET',
    'SOLICITUD_RESERVA'
  ));
