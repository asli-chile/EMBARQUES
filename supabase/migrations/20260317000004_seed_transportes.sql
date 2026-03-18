-- ============================================================================
-- Seed: empresas de transporte, choferes y equipos
-- ============================================================================

DO $$
DECLARE
  v_asli             uuid;
  v_exportlogistic   uuid;
  v_gonzalez         uuid;
  v_jose_rojas       uuid;
  v_san_ignacio      uuid;
  v_sotramac         uuid;
  v_talamilla        uuid;
  v_valentina        uuid;
BEGIN

  -- ─── EMPRESAS ─────────────────────────────────────────────────────────────

  INSERT INTO public.transportes_empresas (nombre) VALUES ('ASLI')
    ON CONFLICT (nombre) DO NOTHING;
  SELECT id INTO v_asli FROM public.transportes_empresas WHERE nombre = 'ASLI';

  INSERT INTO public.transportes_empresas (nombre) VALUES ('EXPORTLOGISTIC')
    ON CONFLICT (nombre) DO NOTHING;
  SELECT id INTO v_exportlogistic FROM public.transportes_empresas WHERE nombre = 'EXPORTLOGISTIC';

  INSERT INTO public.transportes_empresas (nombre) VALUES ('GONZALEZ')
    ON CONFLICT (nombre) DO NOTHING;
  SELECT id INTO v_gonzalez FROM public.transportes_empresas WHERE nombre = 'GONZALEZ';

  INSERT INTO public.transportes_empresas (nombre) VALUES ('JOSE ROJAS')
    ON CONFLICT (nombre) DO NOTHING;
  SELECT id INTO v_jose_rojas FROM public.transportes_empresas WHERE nombre = 'JOSE ROJAS';

  INSERT INTO public.transportes_empresas (nombre) VALUES ('SAN IGNACIO')
    ON CONFLICT (nombre) DO NOTHING;
  SELECT id INTO v_san_ignacio FROM public.transportes_empresas WHERE nombre = 'SAN IGNACIO';

  INSERT INTO public.transportes_empresas (nombre) VALUES ('SOTRAMAC')
    ON CONFLICT (nombre) DO NOTHING;
  SELECT id INTO v_sotramac FROM public.transportes_empresas WHERE nombre = 'SOTRAMAC';

  INSERT INTO public.transportes_empresas (nombre) VALUES ('TALAMILLA')
    ON CONFLICT (nombre) DO NOTHING;
  SELECT id INTO v_talamilla FROM public.transportes_empresas WHERE nombre = 'TALAMILLA';

  INSERT INTO public.transportes_empresas (nombre) VALUES ('VALENTINA')
    ON CONFLICT (nombre) DO NOTHING;
  SELECT id INTO v_valentina FROM public.transportes_empresas WHERE nombre = 'VALENTINA';

  -- ─── CHOFERES ─────────────────────────────────────────────────────────────

  -- ASLI
  INSERT INTO public.transportes_choferes (empresa_id, nombre, rut, telefono) VALUES
    (v_asli, 'JORGE CACERES', '11.282.525-8', '996761710');

  -- EXPORTLOGISTIC
  INSERT INTO public.transportes_choferes (empresa_id, nombre, rut, telefono) VALUES
    (v_exportlogistic, 'JORGE RODRIGUEZ', '18.953.063-3', '975934487'),
    (v_exportlogistic, 'ALEXIS NUÑEZ', '1.603.584-9', '946606393'),
    (v_exportlogistic, 'CARLOS MONTANE', '15.557.126-8', '933721322'),
    (v_exportlogistic, 'CESAR ABARCA', '13.250.166-1', '995393068'),
    (v_exportlogistic, 'CRISTIAN JOFRE', '10.714.544-3', '99043595'),
    (v_exportlogistic, 'CRISTIAN OTEIZA', '16.189.442-7', '938929181'),
    (v_exportlogistic, 'EDUARDO GONZALEZ', '14.702.398-7', '966558734'),
    (v_exportlogistic, 'ENRIQUE LABRA', '14.303.093-3', '951215421'),
    (v_exportlogistic, 'ERIK RODRIGUEZ', '27.159.778-9', '940942296'),
    (v_exportlogistic, 'ESTEBAN SEPULVEDA', '17.139.843-6', '973376435'),
    (v_exportlogistic, 'FRANCISCO NEIRA', '14.470.598-K', '936572189'),
    (v_exportlogistic, 'GABRIEL OLAVE', '6.567.627-3', '944330414'),
    (v_exportlogistic, 'GUILLERMO ARAYA', '18.910.414-6', '988618771'),
    (v_exportlogistic, 'HECTOR ZANETTI', '27.121.515-0', '972167317'),
    (v_exportlogistic, 'HERNAN LUCERO', '10.971.725-8', '992757395'),
    (v_exportlogistic, 'JOSE TOVAR', '19.010.316-1', '938929188'),
    (v_exportlogistic, 'LARRY FLORES', '19.256.480-8', '975934487'),
    (v_exportlogistic, 'LUIS ALFARO', '7.000.409-7', '994463922'),
    (v_exportlogistic, 'MANUEL ALVARADO', '10.236.710-3', '996390712'),
    (v_exportlogistic, 'MARIANO VILLA', '11.241.585-8', '927191120'),
    (v_exportlogistic, 'PATRICIO ARAVENA', '17.092.086-4', '976174541'),
    (v_exportlogistic, 'PATRICIO BUSTAMANTE', '9.677.356-0', '972167418'),
    (v_exportlogistic, 'PATRICIO GONZALEZ', '16.485.863-4', '952383199'),
    (v_exportlogistic, 'RAFAEL ARAUJO', '21.027.311-5', '966979630'),
    (v_exportlogistic, 'RAUL GOMEZ', '14.539.339-6', '942332149'),
    (v_exportlogistic, 'RENATO MEDINA', '15.784.911-5', '941138638'),
    (v_exportlogistic, 'SERGIO HERNANDEZ', '11.385.860-5', '986876395'),
    (v_exportlogistic, 'WALTER GOMEZ ZAPATA', '17.418.831-9', '934918527'),
    (v_exportlogistic, 'YEFRE RODRIGUEZ', '27.334.777-1', '940436245');

  -- GONZALEZ
  INSERT INTO public.transportes_choferes (empresa_id, nombre, rut, telefono) VALUES
    (v_gonzalez, 'MATIAS GONZALEZ', '18.681.667-6', '949200952'),
    (v_gonzalez, 'IGNACIO ALISTE', '19.446.641-2', '979982399'),
    (v_gonzalez, 'JOAQUIN AGUILERA', '17.901.192-1', '974748334'),
    (v_gonzalez, 'RODOLFO CACERES', '18.806.536-6', '995022386');

  -- JOSE ROJAS
  INSERT INTO public.transportes_choferes (empresa_id, nombre, rut, telefono) VALUES
    (v_jose_rojas, 'VICTOR TORRES', '19.008.394-2', '964654003'),
    (v_jose_rojas, 'CATALINA VILLAR', '18.371.448-1', '993237332'),
    (v_jose_rojas, 'JUAN RETAMAL ORELLANA', '9.328.390-2', '964608588');

  -- SAN IGNACIO
  INSERT INTO public.transportes_choferes (empresa_id, nombre, rut, telefono) VALUES
    (v_san_ignacio, 'BAYRON ALCANTARA', '20.988.331-7', '982143922'),
    (v_san_ignacio, 'CAMILO QUIROZ', '19.916.347-7', '972228634'),
    (v_san_ignacio, 'CAMILO ZUÑIGA', '19.067.770-2', '964168509'),
    (v_san_ignacio, 'HERNAN RODRIGUEZ', '14.162.214-5', '920795564'),
    (v_san_ignacio, 'MIGUEL CHACON', '27.335.858-7', '943889655'),
    (v_san_ignacio, 'RAFAEL SANZANA', '19.486.007-2', '956035431'),
    (v_san_ignacio, 'RODRIGO NARANJO', '17.764.703-9', '965538292');

  -- SOTRAMAC
  INSERT INTO public.transportes_choferes (empresa_id, nombre, rut, telefono) VALUES
    (v_sotramac, 'ADOLFO ENDARA', '4.565.305-?', '936791327'),
    (v_sotramac, 'BRANCO MONTECINOS', '20.457.843-5', '930563654'),
    (v_sotramac, 'BRAYAN MOSQUERA', '27.040.673-4', '976457366'),
    (v_sotramac, 'CARLOS MAYER', '10.057.927-8', '973819638'),
    (v_sotramac, 'DAVID BRICEÑO', '26.812.264-8', '972585145'),
    (v_sotramac, 'DOMINGO SILVA', '14.245.999-K', '968413759'),
    (v_sotramac, 'JOSE ROJAS IBAR', '10.515.407-7', '950731593'),
    (v_sotramac, 'KEVIN ERAZO', '19.665.645-6', '926015956');

  -- TALAMILLA
  INSERT INTO public.transportes_choferes (empresa_id, nombre, rut, telefono) VALUES
    (v_talamilla, 'CAMILO SOTO', '18.566.012-5', '930220507'),
    (v_talamilla, 'HECTOR LUCERO', '10.971.719-3', '992757789'),
    (v_talamilla, 'JUAN PABLO TRINCADO', '8.059.747-9', '962292972'),
    (v_talamilla, 'MANUEL ALVARADO', '10.236.710-3', '996390712'),
    (v_talamilla, 'MAURICIO CARVAJAL', '16.990.833-8', '939190348');

  -- VALENTINA
  INSERT INTO public.transportes_choferes (empresa_id, nombre, rut, telefono) VALUES
    (v_valentina, 'BERNABE IBARRA', '9.763.037-2', '984199586'),
    (v_valentina, 'CAMILO ROCO', '16.337.170-7', '959377902'),
    (v_valentina, 'EDUARDO TUDELA', '18.558.926-9', '964631954'),
    (v_valentina, 'JOAN MORAN', '27.036.433-0', '950992793');

  -- ─── EQUIPOS ──────────────────────────────────────────────────────────────

  -- ASLI
  INSERT INTO public.transportes_equipos (empresa_id, patente_camion, patente_remolque) VALUES
    (v_asli, 'PWXW49', NULL)
    ON CONFLICT (patente_camion) DO NOTHING;

  -- EXPORTLOGISTIC
  INSERT INTO public.transportes_equipos (empresa_id, patente_camion, patente_remolque) VALUES
    (v_exportlogistic, 'FTXJ43', 'JJ7036'),
    (v_exportlogistic, 'YU5335', 'PXGH49'),
    (v_exportlogistic, 'DPJR10', 'J1135'),
    (v_exportlogistic, 'DRHY79', NULL),
    (v_exportlogistic, 'BTGS98', NULL),
    (v_exportlogistic, 'PYCL35', 'PXHH55'),
    (v_exportlogistic, 'HJRP45', NULL),
    (v_exportlogistic, 'KBLT33', 'PXBB54'),
    (v_exportlogistic, 'YW5403', 'GRCB88'),
    (v_exportlogistic, 'DPRP68', 'PXBB53'),
    (v_exportlogistic, 'DPVL13', NULL),
    (v_exportlogistic, 'BTCF59', NULL),
    (v_exportlogistic, 'VL6106', 'HGJS95'),
    (v_exportlogistic, 'DTSC46', NULL),
    (v_exportlogistic, 'DRXP67', NULL),
    (v_exportlogistic, 'CDRH13', 'JC4869'),
    (v_exportlogistic, 'KJHP69', 'PWYY98'),
    (v_exportlogistic, 'CZVJ98', 'JC4848'),
    (v_exportlogistic, 'DBXR28', 'JK6489'),
    (v_exportlogistic, 'XX7481', 'JC4844'),
    (v_exportlogistic, 'KPXJ71', NULL),
    (v_exportlogistic, 'CWHC96', NULL),
    (v_exportlogistic, 'DBRF53', NULL),
    (v_exportlogistic, 'JGVK30', 'JF4920'),
    (v_exportlogistic, 'FHYZ10', NULL),
    (v_exportlogistic, 'ZU6724', 'JD4585'),
    (v_exportlogistic, 'YR3322', 'JD3028'),
    (v_exportlogistic, 'DTGW16', NULL),
    (v_exportlogistic, 'CZLW47', 'HXDS56')
    ON CONFLICT (patente_camion) DO NOTHING;

  -- GONZALEZ
  INSERT INTO public.transportes_equipos (empresa_id, patente_camion, patente_remolque) VALUES
    (v_gonzalez, 'CHWR40', 'JK2012'),
    (v_gonzalez, 'YG5654', 'JH5621'),
    (v_gonzalez, 'WR7668', 'JH5621'),
    (v_gonzalez, 'GBVL22', 'JH5621')
    ON CONFLICT (patente_camion) DO NOTHING;

  -- JOSE ROJAS
  INSERT INTO public.transportes_equipos (empresa_id, patente_camion, patente_remolque) VALUES
    (v_jose_rojas, 'GFVC11', 'KYRB98'),
    (v_jose_rojas, 'GKGH75', NULL),
    (v_jose_rojas, 'UY5921', NULL)
    ON CONFLICT (patente_camion) DO NOTHING;

  -- SAN IGNACIO
  INSERT INTO public.transportes_equipos (empresa_id, patente_camion, patente_remolque) VALUES
    (v_san_ignacio, 'CLPB80', 'JG4560'),
    (v_san_ignacio, 'TK4537', 'JN2601'),
    (v_san_ignacio, 'VT6167', 'KYPX95'),
    (v_san_ignacio, 'BFXZ48', 'HGJC52'),
    (v_san_ignacio, 'NS7581', 'JP2734'),
    (v_san_ignacio, 'BTJH96', 'JG4560')
    ON CONFLICT (patente_camion) DO NOTHING;

  -- SOTRAMAC
  INSERT INTO public.transportes_equipos (empresa_id, patente_camion, patente_remolque) VALUES
    (v_sotramac, 'YH2661', NULL),
    (v_sotramac, 'DRPS61', NULL),
    (v_sotramac, 'UZ3111', 'JA6941'),
    (v_sotramac, 'DBXF53', NULL),
    (v_sotramac, 'JXZX69', 'JK2012'),
    (v_sotramac, 'DPWL85', 'JA6123'),
    (v_sotramac, 'HKFL86', NULL),
    (v_sotramac, 'CFZB12', 'PXGH97')
    ON CONFLICT (patente_camion) DO NOTHING;

  -- TALAMILLA
  INSERT INTO public.transportes_equipos (empresa_id, patente_camion, patente_remolque) VALUES
    (v_talamilla, 'KHBF53', NULL),
    (v_talamilla, 'DCDV88', 'JF5321'),
    (v_talamilla, 'WR7216', NULL),
    (v_talamilla, 'DBXR27', 'JK6489'),
    (v_talamilla, 'GVPB91', 'JD4669')
    ON CONFLICT (patente_camion) DO NOTHING;

  -- VALENTINA
  INSERT INTO public.transportes_equipos (empresa_id, patente_camion, patente_remolque) VALUES
    (v_valentina, 'FXRX56', NULL),
    (v_valentina, 'WS6125', 'JJ6359'),
    (v_valentina, 'DHDR28', 'PWYZ61'),
    (v_valentina, 'CJFZ94', NULL)
    ON CONFLICT (patente_camion) DO NOTHING;

END $$;
