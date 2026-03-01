-- ============================================================================
-- SEED: Navieras, Naves y relaciones Naves-Naviera
-- ============================================================================

-- ─── CREAR TABLAS SI NO EXISTEN ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS navieras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS naves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS navieras_naves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nave_id UUID NOT NULL REFERENCES naves(id) ON DELETE CASCADE,
  naviera_id UUID NOT NULL REFERENCES navieras(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nave_id, naviera_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_navieras_naves_nave ON navieras_naves(nave_id);
CREATE INDEX IF NOT EXISTS idx_navieras_naves_naviera ON navieras_naves(naviera_id);

-- ─── INSERTAR NAVIERAS ───────────────────────────────────────────────────────
INSERT INTO navieras (nombre) VALUES
  ('MAERSK'),
  ('MSC'),
  ('ONE'),
  ('HAPAG-LLOYD'),
  ('CMA-CGM'),
  ('OOCL'),
  ('COSCO'),
  ('EVERGREEN'),
  ('WAN HAI'),
  ('PIL'),
  ('YANG MING'),
  ('ZIM'),
  ('UNIFER')
ON CONFLICT (nombre) DO NOTHING;

-- ─── INSERTAR NAVES ──────────────────────────────────────────────────────────
INSERT INTO naves (nombre) VALUES
  ('AMSTERDAM EXPRESS'),
  ('ANS'),
  ('ANTHEA Y'),
  ('APL CHARLESTON'),
  ('APL SALALAH'),
  ('BEIJING'),
  ('BOGOR'),
  ('BUENAVENTURA EXPRESS'),
  ('BUENOS AIRES EXPRESS'),
  ('CALLAO EXPRESS'),
  ('CAPE HELLAS'),
  ('CARTAGENA EXPRESS'),
  ('CHARLOTTE MAERSK'),
  ('CLIFFORD MAERSK'),
  ('CMA CGM ALIAGA'),
  ('CMA CGM BEIRA'),
  ('CMA CGM BYBLOS'),
  ('CMA CGM CARL ANTOINE'),
  ('CMA CGM ELBE'),
  ('CMA CGM ESTELLE'),
  ('CMA CGM FORT JAMES'),
  ('CMA CGM INDIA'),
  ('CMA CGM JACQUES JOSEPH'),
  ('CMA CGM JAPET'),
  ('CMA CGM LEGACY'),
  ('CMA CGM LITANI'),
  ('CMA CGM MEKONG'),
  ('CMA CGM MISSOURI'),
  ('CMA CGM MUNGO'),
  ('CMA CGM THAMES'),
  ('CMA CGM WHITE'),
  ('CMA CGM XIAMEN'),
  ('COSCO AMERICA'),
  ('COSCO ASIA'),
  ('COSCO MALAYSIA'),
  ('COSCO PACIFIC'),
  ('COSCO SHIPPING SEINE'),
  ('COSCO SHIPPING THAMES'),
  ('COSCO SHIPPING VOLGA'),
  ('CSCL ASIA'),
  ('EVER FASHION'),
  ('EVER FRONT'),
  ('EVER LAMBENT'),
  ('EVER LEGEND'),
  ('EVER LEGION'),
  ('EVER LIBERAL'),
  ('EVER LINKING'),
  ('EVER LISSOME'),
  ('EVER LOYAL'),
  ('EVER LUCKY'),
  ('EVER LUNAR'),
  ('FORT DESAIX'),
  ('GUAYAQUIL EXPRESS'),
  ('HMM BLESSING'),
  ('HUMBOLDT EXPRESS'),
  ('ISTANBUL EXPRESS'),
  ('ITAJAI EXPRESS'),
  ('JAIPUR MAERSK'),
  ('JPO LIBRA'),
  ('JPO PISCES'),
  ('KOTA CAHAYA'),
  ('KOTA CANTIK'),
  ('KOTA CARUM'),
  ('KOTA MANZANILLO'),
  ('KOTA ODYSSEY'),
  ('KOTA PELAGANI'),
  ('KOTA SALAM'),
  ('KOTA SANTOS'),
  ('LIMA EXPRESS'),
  ('MAERSK BALI'),
  ('MAERSK BATAM'),
  ('MAERSK BATUR'),
  ('MAERSK BAYETE'),
  ('MAERSK BENGUELA'),
  ('MAERSK BINTAN'),
  ('MAERSK BOGOR'),
  ('MAERSK BULAN'),
  ('MAERSK EVERGLADES'),
  ('MAERSK LIMA'),
  ('MAERSK SALTORO'),
  ('MAERSK SAN CRISTOBAL'),
  ('MAERSK YUKON'),
  ('MANZANILLO EXPRESS'),
  ('MARTINIQUE'),
  ('MATTHEW SCHULTE'),
  ('MONACO'),
  ('MONTEVIDEO EXPRESS'),
  ('MSC ALANYA'),
  ('MSC ALINA'),
  ('MSC ASTRID'),
  ('MSC BARI'),
  ('MSC BERN V'),
  ('MSC BIANCA'),
  ('MSC BRUNELLA'),
  ('MSC CAMEROON'),
  ('MSC CANDIDA'),
  ('MSC CARMELA'),
  ('MSC CARMELITA'),
  ('MSC CAROLE'),
  ('MSC CASSANDRE'),
  ('MSC CHANNE'),
  ('MSC CHIYO'),
  ('MSC CHLOE'),
  ('MSC EDNA'),
  ('MSC ELENOIRE'),
  ('MSC EMILIA'),
  ('MSC EUGENIA'),
  ('MSC FREEPORT'),
  ('MSC GENOVA'),
  ('MSC ILENIA'),
  ('MSC IVA'),
  ('MSC JAPAN III'),
  ('MSC JULIETTE'),
  ('MSC JUSTICE VII'),
  ('MSC LELLA'),
  ('MSC LETIZIA'),
  ('MSC LIVORNO'),
  ('MSC MONTSERRAT III'),
  ('MSC NIGERIA'),
  ('MSC NISHA V'),
  ('MSC NITYA B'),
  ('MSC NOA ARIELA'),
  ('MSC ORSOLA'),
  ('MSC PALAK'),
  ('MSC PANTERA'),
  ('MSC PISA'),
  ('MSC POLONIA'),
  ('MSC RAYSHMI'),
  ('MSC ROUEN'),
  ('MSC SAMIA'),
  ('MSC SASHA'),
  ('MSC SERENA'),
  ('MSC TAKORADI VIII'),
  ('MSC TEMA VIII'),
  ('MSC TOGO'),
  ('MSC VALENTINA'),
  ('MSC VICTORIA'),
  ('MSC VIRGO'),
  ('MSC VIVIENNE'),
  ('NAVIOS AMARILLO'),
  ('NAVIOS LAPIS'),
  ('ONE COLUMBA'),
  ('ONE IBIS'),
  ('ONE SAPPHIRE'),
  ('ONE SINCERITY'),
  ('ONE SPHERE'),
  ('ONE SPIRIT'),
  ('ONE SPLENDOUR'),
  ('OOCL HO CHI MINH CITY'),
  ('POSORJA EXPRESS'),
  ('REDWOOD'),
  ('RIO DE JANEIRO EXPRESS'),
  ('SALLY MAERSK'),
  ('SANTOS EXPRESS'),
  ('SEASPAN BEAUTY'),
  ('SEASPAN BELIEF'),
  ('SEASPAN BENEFACTOR'),
  ('SEASPAN BRIGHTNESS'),
  ('SEASPAN HAMBURG'),
  ('SEASPAN RAPTOR'),
  ('SERENA'),
  ('SKAGEN MAERSK'),
  ('STAMATIS B'),
  ('SYNERGY OAKLAND'),
  ('VALPARAISO EXPRESS'),
  ('WAN HAI 512'),
  ('WAN HAI 612'),
  ('WAN HAI 613'),
  ('WAN HAI 625'),
  ('WAN HAI 721'),
  ('WAN HAI 722'),
  ('WAN HAI V02'),
  ('XH DOLPHIN'),
  ('XIN DA LIAN'),
  ('XIN HONG KONG'),
  ('XIN LOS ANGELES'),
  ('XIN OU ZHOU'),
  ('YANTIAN'),
  ('YM ENLIGHTENMENT'),
  ('YM EXCELLENCE'),
  ('YM FOUNTAIN'),
  ('YM SUCCESS'),
  ('ZIM LUANDA')
ON CONFLICT (nombre) DO NOTHING;

-- ─── INSERTAR RELACIONES NAVES-NAVIERA ───────────────────────────────────────
-- Usamos una CTE para obtener los IDs de naves y navieras

INSERT INTO navieras_naves (nave_id, naviera_id)
SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'AMSTERDAM EXPRESS' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ANS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ANTHEA Y' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ANTHEA Y' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ANTHEA Y' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'APL CHARLESTON' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'APL CHARLESTON' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'APL CHARLESTON' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'APL SALALAH' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'APL SALALAH' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BEIJING' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BEIJING' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BEIJING' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BOGOR' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BUENAVENTURA EXPRESS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BUENAVENTURA EXPRESS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BUENAVENTURA EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BUENOS AIRES EXPRESS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BUENOS AIRES EXPRESS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'BUENOS AIRES EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CALLAO EXPRESS' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CALLAO EXPRESS' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CALLAO EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CAPE HELLAS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CAPE HELLAS' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CARTAGENA EXPRESS' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CARTAGENA EXPRESS' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CARTAGENA EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CHARLOTTE MAERSK' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CLIFFORD MAERSK' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM ALIAGA' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM ALIAGA' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM BEIRA' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM BEIRA' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM BYBLOS' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM BYBLOS' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM BYBLOS' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM CARL ANTOINE' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM CARL ANTOINE' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM CARL ANTOINE' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM ELBE' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM ESTELLE' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM ESTELLE' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM ESTELLE' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM FORT JAMES' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM FORT JAMES' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM FORT JAMES' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM INDIA' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM JACQUES JOSEPH' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM JACQUES JOSEPH' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM JACQUES JOSEPH' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM JAPET' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM LEGACY' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM LEGACY' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM LEGACY' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM LITANI' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM LITANI' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM LITANI' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM MEKONG' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM MEKONG' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM MEKONG' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM MISSOURI' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM MISSOURI' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM MUNGO' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM THAMES' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM THAMES' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM THAMES' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM WHITE' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM WHITE' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM XIAMEN' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM XIAMEN' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CMA CGM XIAMEN' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO AMERICA' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO AMERICA' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO AMERICA' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO ASIA' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO ASIA' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO ASIA' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO MALAYSIA' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO MALAYSIA' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO MALAYSIA' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO PACIFIC' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO PACIFIC' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO PACIFIC' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO SHIPPING SEINE' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO SHIPPING SEINE' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO SHIPPING SEINE' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO SHIPPING THAMES' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO SHIPPING THAMES' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO SHIPPING THAMES' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'COSCO SHIPPING VOLGA' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'CSCL ASIA' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER FASHION' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER FASHION' AND nav.nombre = 'EVERGREEN'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER FASHION' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER FASHION' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER FRONT' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER FRONT' AND nav.nombre = 'EVERGREEN'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER FRONT' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER FRONT' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LAMBENT' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LAMBENT' AND nav.nombre = 'EVERGREEN'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LAMBENT' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LAMBENT' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LEGEND' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LEGEND' AND nav.nombre = 'EVERGREEN'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LEGEND' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LEGEND' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LEGION' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LIBERAL' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LIBERAL' AND nav.nombre = 'EVERGREEN'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LIBERAL' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LIBERAL' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LINKING' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LINKING' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LISSOME' AND nav.nombre = 'EVERGREEN'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LISSOME' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LISSOME' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LISSOME' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LISSOME' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LOYAL' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LOYAL' AND nav.nombre = 'EVERGREEN'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LOYAL' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LOYAL' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LUCKY' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LUCKY' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LUCKY' AND nav.nombre = 'EVERGREEN'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LUCKY' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LUNAR' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LUNAR' AND nav.nombre = 'EVERGREEN'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LUNAR' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'EVER LUNAR' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'FORT DESAIX' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'GUAYAQUIL EXPRESS' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'GUAYAQUIL EXPRESS' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'GUAYAQUIL EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'HMM BLESSING' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'HMM BLESSING' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'HMM BLESSING' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'HUMBOLDT EXPRESS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'HUMBOLDT EXPRESS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'HUMBOLDT EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ISTANBUL EXPRESS' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ISTANBUL EXPRESS' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ISTANBUL EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ITAJAI EXPRESS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ITAJAI EXPRESS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ITAJAI EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'JAIPUR MAERSK' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'JPO LIBRA' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'JPO PISCES' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA CAHAYA' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA CAHAYA' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA CANTIK' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA CANTIK' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA CARUM' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA MANZANILLO' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA MANZANILLO' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA MANZANILLO' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA ODYSSEY' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA ODYSSEY' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA PELAGANI' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA SALAM' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'KOTA SANTOS' AND nav.nombre = 'PIL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'LIMA EXPRESS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'LIMA EXPRESS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'LIMA EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK BALI' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK BATAM' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK BATUR' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK BAYETE' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK BENGUELA' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK BINTAN' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK BOGOR' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK BULAN' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK EVERGLADES' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK LIMA' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK SALTORO' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK SAN CRISTOBAL' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MAERSK YUKON' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MANZANILLO EXPRESS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MANZANILLO EXPRESS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MANZANILLO EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MARTINIQUE' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MARTINIQUE' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MATTHEW SCHULTE' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MATTHEW SCHULTE' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MONACO' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MONACO' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MONACO' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MONTEVIDEO EXPRESS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MONTEVIDEO EXPRESS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MONTEVIDEO EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ALANYA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ALINA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ASTRID' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC BARI' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC BERN V' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC BIANCA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC BRUNELLA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CAMEROON' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CANDIDA' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CANDIDA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CANDIDA' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CARMELA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CARMELITA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CAROLE' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CASSANDRE' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CHANNE' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CHIYO' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CHIYO' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CHIYO' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC CHLOE' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC EDNA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ELENOIRE' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ELENOIRE' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ELENOIRE' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC EMILIA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC EUGENIA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC FREEPORT' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC GENOVA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ILENIA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC IVA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC JAPAN III' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC JULIETTE' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC JULIETTE' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC JULIETTE' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC JUSTICE VII' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC LELLA' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC LELLA' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC LELLA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC LETIZIA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC LIVORNO' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC MONTSERRAT III' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC NIGERIA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC NISHA V' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC NITYA B' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC NOA ARIELA' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC NOA ARIELA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC NOA ARIELA' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ORSOLA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ORSOLA' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ORSOLA' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC PALAK' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC PANTERA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC PISA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC POLONIA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC RAYSHMI' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC ROUEN' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC SAMIA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC SASHA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC SERENA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC TAKORADI VIII' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC TEMA VIII' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC TOGO' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VALENTINA' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VALENTINA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VALENTINA' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VICTORIA' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VICTORIA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VICTORIA' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VIRGO' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VIRGO' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VIRGO' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VIVIENNE' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VIVIENNE' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'MSC VIVIENNE' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'NAVIOS AMARILLO' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'NAVIOS AMARILLO' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'NAVIOS AMARILLO' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'NAVIOS LAPIS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'NAVIOS LAPIS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'NAVIOS LAPIS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE COLUMBA' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE IBIS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SAPPHIRE' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SAPPHIRE' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SAPPHIRE' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SINCERITY' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SINCERITY' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SINCERITY' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SPHERE' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SPHERE' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SPHERE' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SPIRIT' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SPIRIT' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SPIRIT' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SPLENDOUR' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SPLENDOUR' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ONE SPLENDOUR' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'OOCL HO CHI MINH CITY' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'OOCL HO CHI MINH CITY' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'OOCL HO CHI MINH CITY' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'POSORJA EXPRESS' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'REDWOOD' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'RIO DE JANEIRO EXPRESS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'RIO DE JANEIRO EXPRESS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'RIO DE JANEIRO EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SALLY MAERSK' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SALLY MAERSK' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SANTOS EXPRESS' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SANTOS EXPRESS' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SANTOS EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BEAUTY' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BEAUTY' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BEAUTY' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BELIEF' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BELIEF' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BELIEF' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BENEFACTOR' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BENEFACTOR' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BENEFACTOR' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BRIGHTNESS' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BRIGHTNESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN BRIGHTNESS' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN HAMBURG' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN HAMBURG' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN HAMBURG' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN RAPTOR' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN RAPTOR' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SEASPAN RAPTOR' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SERENA' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SKAGEN MAERSK' AND nav.nombre = 'MAERSK'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'STAMATIS B' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'STAMATIS B' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'STAMATIS B' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SYNERGY OAKLAND' AND nav.nombre = 'MSC'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SYNERGY OAKLAND' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'SYNERGY OAKLAND' AND nav.nombre = 'ONE'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'VALPARAISO EXPRESS' AND nav.nombre = 'CMA-CGM'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'VALPARAISO EXPRESS' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'VALPARAISO EXPRESS' AND nav.nombre = 'HAPAG-LLOYD'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'WAN HAI 512' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'WAN HAI 612' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'WAN HAI 613' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'WAN HAI 613' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'WAN HAI 625' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'WAN HAI 721' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'WAN HAI 722' AND nav.nombre = 'WAN HAI'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'WAN HAI 722' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'WAN HAI V02' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'XH DOLPHIN' AND nav.nombre = 'UNIFER'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'XIN DA LIAN' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'XIN HONG KONG' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'XIN HONG KONG' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'XIN LOS ANGELES' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'XIN OU ZHOU' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'XIN OU ZHOU' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'YANTIAN' AND nav.nombre = 'OOCL'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'YANTIAN' AND nav.nombre = 'COSCO'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'YM ENLIGHTENMENT' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'YM EXCELLENCE' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'YM FOUNTAIN' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'YM SUCCESS' AND nav.nombre = 'YANG MING'
UNION ALL SELECT n.id, nav.id FROM naves n, navieras nav WHERE n.nombre = 'ZIM LUANDA' AND nav.nombre = 'ZIM'
ON CONFLICT DO NOTHING;
