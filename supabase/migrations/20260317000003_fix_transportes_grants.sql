-- Fix: otorgar INSERT/UPDATE/DELETE a authenticated en tablas de transportes
-- La migración original solo otorgó SELECT, lo que impedía al staff crear registros

GRANT INSERT, UPDATE, DELETE ON public.transportes_empresas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.transportes_choferes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.transportes_equipos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.transportes_tramos TO authenticated;
