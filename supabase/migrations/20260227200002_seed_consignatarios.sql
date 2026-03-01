-- ============================================================================
-- SEED: Consignatarios
-- ============================================================================

-- ─── CREAR TABLA ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consignatarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cliente TEXT,
  destino TEXT,
  
  -- Datos del consignatario
  consignee_company TEXT,
  consignee_address TEXT,
  consignee_attn TEXT,
  consignee_uscc TEXT,
  consignee_mobile TEXT,
  consignee_email TEXT,
  consignee_zip TEXT,
  
  -- Datos del notify
  notify_company TEXT,
  notify_address TEXT,
  notify_attn TEXT,
  notify_uscc TEXT,
  notify_mobile TEXT,
  notify_email TEXT,
  notify_zip TEXT,
  
  -- Metadata
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_consignatarios_cliente ON consignatarios(cliente);
CREATE INDEX IF NOT EXISTS idx_consignatarios_destino ON consignatarios(destino);
CREATE INDEX IF NOT EXISTS idx_consignatarios_activo ON consignatarios(activo);

-- ─── INSERTAR DATOS ──────────────────────────────────────────────────────────

INSERT INTO consignatarios (
  id, nombre, cliente, destino,
  consignee_company, consignee_address, consignee_attn, consignee_uscc,
  consignee_mobile, consignee_email, consignee_zip,
  notify_company, notify_address, notify_attn, notify_uscc,
  notify_mobile, notify_email, notify_zip,
  activo, notas, created_at, updated_at, created_by
) VALUES
(
  '633efd41-5caf-4a45-840a-3ed2727084dd',
  'Lion King Supply Chain Management Co., LTD',
  'ALMAFRUIT',
  'HONG KONG',
  'Lion King Supply Chain Management Co., LTDLion King Supply Chain Management Co., LTD',
  'No.1, Building 17, No.10 Xiadaotou, Meishan Meizhong Village, 
Beilun District, Ningbo city, Zhejiang Province, China',
  '',
  '91330206309078658Y',
  '+86 13811775757',
  'import@xianfengsg.com',
  '',
  'Lion King Supply Chain Management Co., LTDLion King Supply Chain Management Co., LTD',
  'No.1, Building 17, No.10 Xiadaotou, Meishan Meizhong Village, 
Beilun District, Ningbo city, Zhejiang Province, China',
  '',
  '91330206309078658Y',
  '+86 13811775757',
  'import@xianfengsg.com',
  '',
  true,
  '',
  '2026-02-01 04:22:43.567906+00',
  '2026-02-01 04:50:33.486751+00',
  '56490407-e6bc-451d-9155-357ea29ab8e1'
),
(
  'e230c1f9-bd27-47d4-8ba4-fe850847c256',
  'ENHUE(GUANGZHOU) BUSINESS TRADING CO.,LTD',
  'ALMAFRUIT',
  'SHANGHAI',
  'SHANGHAI HUI ZHAN INTERNATIONAL TRADE CO.,LTD',
  'FLOOR 4, NO.288 DINGJIN ROAD, JINHUI TOWN, FENGXIAN DISTRICT, SHANGHAI, CHINA',
  'JESS ZHENG',
  '91310112MA1GBTFP24',
  '15202177108',
  'jessy.zheng@huizhanguomao.com',
  '201404',
  'SHANGHAI HUI ZHAN INTERNATIONAL TRADE CO.,LTD',
  'FLOOR 4, NO.288 DINGJIN ROAD, JINHUI TOWN, FENGXIAN DISTRICT, SHANGHAI, CHINA',
  'JESS ZHENG',
  '91310112MA1GBTFP24',
  '15202177108',
  'jessy.zheng@huizhanguomao.com',
  '201404',
  true,
  '',
  '2026-02-01 04:14:16.772201+00',
  '2026-02-01 04:35:59.352027+00',
  '56490407-e6bc-451d-9155-357ea29ab8e1'
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  cliente = EXCLUDED.cliente,
  destino = EXCLUDED.destino,
  consignee_company = EXCLUDED.consignee_company,
  consignee_address = EXCLUDED.consignee_address,
  consignee_attn = EXCLUDED.consignee_attn,
  consignee_uscc = EXCLUDED.consignee_uscc,
  consignee_mobile = EXCLUDED.consignee_mobile,
  consignee_email = EXCLUDED.consignee_email,
  consignee_zip = EXCLUDED.consignee_zip,
  notify_company = EXCLUDED.notify_company,
  notify_address = EXCLUDED.notify_address,
  notify_attn = EXCLUDED.notify_attn,
  notify_uscc = EXCLUDED.notify_uscc,
  notify_mobile = EXCLUDED.notify_mobile,
  notify_email = EXCLUDED.notify_email,
  notify_zip = EXCLUDED.notify_zip,
  activo = EXCLUDED.activo,
  notas = EXCLUDED.notas,
  updated_at = EXCLUDED.updated_at;
