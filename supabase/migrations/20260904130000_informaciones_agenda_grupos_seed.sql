-- Reemplazo agenda: contactos separados por Labels del CSV contacts_1_corregidos.csv
-- Grupos: CLIENTES BERRIES Y ARANDANOS | EQUIPO ASLI | INFO CLIENTES | OPERMAN
-- Contactos únicos: 158

-- Quitar grupo legacy monolítico
DELETE FROM public.informaciones_grupo_miembros
WHERE grupo_id IN (
  SELECT id FROM public.informaciones_grupos WHERE nombre = 'Informaciones ASLI'
);
DELETE FROM public.informaciones_grupos WHERE nombre = 'Informaciones ASLI';

INSERT INTO public.informaciones_grupos (nombre)
VALUES
  ('CLIENTES BERRIES Y ARANDANOS'),
  ('EQUIPO ASLI'),
  ('INFO CLIENTES'),
  ('OPERMAN')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.informaciones_contactos (nombre, email, empresa)
VALUES
  ('EXP. AGUA SANTA', 'contacto@aguasanta.cl', 'EXP. AGUA SANTA'),
  ('HUBERRY EXPORT', 'info@frutber.com', 'HUBERRY EXPORT'),
  ('NORTH BAY CHILE', 'marketing@northbayproduce.com', 'NORTH BAY CHILE'),
  ('PATAGONIA FRUITS SPA', 'info@patagoniafruit.cl', 'PATAGONIA FRUITS SPA'),
  ('ZUAGRO EXPORTADORA', 'contacto@zuagro.cl', 'ZUAGRO EXPORTADORA'),
  ('Alex Cárdenas', 'alex.cardenas@asli.cl', 'ASLI'),
  ('Hans Vásquez', 'hans.vasquez@asli.cl', 'ASLI'),
  ('Mario Basaez', 'mario.basaez@asli.cl', 'ASLI'),
  ('Nina Scotti', 'nina.scotti@asli.cl', 'ASLI'),
  ('Poliana Cisternas', 'poliana.cisternas@asli.cl', 'ASLI'),
  ('Ricardo Lazo', 'ricardo.lazo@asli.cl', 'ASLI'),
  ('Rocio Villarroel', 'rocio.villarroel@asli.cl', 'ASLI'),
  ('Rodrigo Cáceres', 'rodrigo.caceres@asli.cl', 'ASLI'),
  ('Rodrigo Castillo', 'rodrigo.castillo@asli.cl', 'ASLI'),
  ('Stefanie Córdova', 'stefanie.cordova@asli.cl', 'ASLI'),
  ('Cristian Silva', 'cristiansilva@aisienchina.com', 'FENIX'),
  ('Abraham Quezada', 'abraham.quezada@naturesouth.cl', 'Nature South'),
  ('Agustin Weason', 'aweason@redstar.cl', 'Red Star'),
  ('Alejandra Canclini', 'acanclini@briza.cl', 'Briza'),
  ('Alejandra Gonzalez', 'alejandra.gonzalez@salmonesaustral.cl', 'Salmones Austral'),
  ('Alejandro Neira', 'aneira@briza.cl', 'Briza'),
  ('ALEX ASTUDILLO', 'aastudillo@quintayfruit.cl', 'Quintay Fruit'),
  ('ALEX MARTINEZ', 'alexis.martinez@goldanda.cl', 'Gold Anda Chile'),
  ('ALEX PAREDES', 'alex.paredes@cermaq.com', 'CERMAQ'),
  ('Alexis Alvarado', 'alexis.alvarado@oxzo.cl', 'Oxzo'),
  ('Alfonso Frias', 'afrias@blossom.cl', 'Blossom Export'),
  ('Alfonso Naguian', 'anaguian@caletabay.cl', 'CALETA BAY'),
  ('Alfredo', 'alfredo@farawayland.cl', 'Faraway Land'),
  ('Almafruit Export', 'almafruitexport@gmail.com', NULL),
  ('Alonso Salgado', 'alonso.salgado@vrfoods.cl', 'VR Foods'),
  ('Alvaro Larrondo', 'alarrondo@terrafrut.cl', 'Terrafrut'),
  ('Andre Courtin', 'andre.courtin@greenex.cl', 'Greenex'),
  ('Andrea Gonzalez', 'andrea.gonzalez@esperanza-verde.com', 'Esperanza Verde'),
  ('Andrés Hederra', 'ahederra@gmail.com', 'ALMAFRUIT'),
  ('Andres Mansilla', 'andres@aqua-link.cl', 'AQUALINK'),
  ('Andrés Miranda', 'amiranda@jotrisa.cl', 'Jotrisa'),
  ('Angelo Lagos', 'angelolagos@sglchile.com', 'SGL Chile'),
  ('Anibal Caminitti', 'gerenciacapci@gmail.com', 'CAPCI'),
  ('Antonia Oyarzún', 'antonia.oyarzun@copefrut.com', 'COPEFRUT'),
  ('Antonia Pinochet', 'aipinoch@uc.cl', 'Agrícola Independencia'),
  ('Antonio Vera', 'antonio.vera@aysenpacific.com', 'AYSEN PACIFIC'),
  ('Ariel Galleguillos', 'agalleguillos@cylfruit.com', 'C&L Fruit'),
  ('Augusto Frias', 'augustofrias@blossom.cl', 'Blossom Export'),
  ('Benjamin Cardoen', 'benjamincardoen@sanandresexport.cl', NULL),
  ('Bernardita Luco', 'ventas@eltorreon.cl', 'El Torreon'),
  ('Bianca Trujillo', 'bianca.trujillo@naturesouth.cl', 'Nature South'),
  ('Camila Jarabrán', 'cjarabran@fruitandesur.cl', NULL),
  ('Camila Méndez', 'comex@greenex.cl', 'Greenex'),
  ('CARLOS SAA', 'carlos.saa@blumar.com', 'Blumar'),
  ('Cecilia Guzman', 'cguzman@coexca.cl', 'COEXCA'),
  ('Cecilia Rosas', 'cecilia.rosas@cookeaqua.com', 'COOKE AQUA'),
  ('Claudia Duarte', 'cduarte@chilfresh.cl', 'Chilfresh'),
  ('Claudia Huerta', 'claudia.huerta@almafruit.cl', 'Alma Fruit'),
  ('Cristian Bahamondes', 'cbahamondes@pompeiatrade.cl', 'Pompeia Trade'),
  ('Cristian Fuller', 'cfuller@losnobles.cl', 'Los Robles'),
  ('Cristian López', 'clopez@fruitandesur.cl', 'Fruit Andes fruit'),
  ('Cristian Morris', 'cristianm@thegrowers.club', 'The Growers Club'),
  ('Cristian Muñoz', 'cristian.munoz@mowi.com', 'MOWI'),
  ('Cristian Pinochet', 'cpinochet@cindependencia.cl', 'Agrícola Independencia'),
  ('CRISTOBAL CARDENAS', 'araya.cardenas.cristobal@gmail.com', 'Esperanza Verde'),
  ('Cristobal Lozano', 'cristoballozano@agricolals.com', 'Agrícola LS'),
  ('D Rojas', 'drojas@leice.cl', 'Agrícola Independencia'),
  ('DANIEL SAINT MARTIN', 'daniel@pai-argentina.com', 'PAI ARGENTINA'),
  ('Daniel Saldivia', 'daniel.saldivia@ulmoltda.cl', 'ULMO'),
  ('David Mancilla', 'demancilla@patagoniaoceanfood.cl', 'Patagonia Ocean Food'),
  ('Diego Velasquez', 'dvelasquez@multi-xsalmon.com', 'Multiexport'),
  ('Eduardo Montenegro', 'emontenegro@redandblueberries.cl', 'Red & Blueberries'),
  ('Elia Pezo', 'epezo@integrachile.com', 'Integra Chile'),
  ('Enrique Lorda', 'elorda@kleppe.com.ar', 'Kleppe'),
  ('Ertan Ertas', 'ertanertas33@gmail.com', NULL),
  ('Facundo Quiros', 'facundoquiros@yahoo.com', 'Cámara de Cerezas de Mendoza'),
  ('Felipe Larenas', 'flarenas@vifchile.cl', 'VIF Chile'),
  ('Felipe Quilodran', 'felipe.quilodran@fiordoaustral.com', 'Fiordo Austral'),
  ('Félix Escobar', 'fescobar@dfaneuquen.com', 'Depósito Fiscal de Neuquen'),
  ('Fernanda Ortiz', 'fernanda.ortiz@aysenpacific.com', 'AYSEN PACIFIC'),
  ('Fernando Mercado', 'fernando@fruitsexport.cl', 'Fruits Export'),
  ('Francisca Diaz', 'fdiaz@coexca.cl', 'COEXCA'),
  ('Francisco Astaburuaga', 'fastaburuaga@xsur.cl', 'X Sur'),
  ('Gabriel Ojeda', 'gabriel.ojeda@mowi.com', 'MOWI'),
  ('Genoveva Volke', 'exportaciones@southwind.cl', 'Pesquera Southwind'),
  ('German Vergara', 'administracion@pacificseachile.com', 'Pacific Sea'),
  ('Hans Leibbrandt', 'hans.leibbrandt@monfrut.cl', 'Monfrut'),
  ('Hernán De Bellis', 'hdebellis@extraberries.com', 'Extra Berries'),
  ('J Oyarzo', 'joyarzo@acmechile.com', 'ACME CHILE'),
  ('Javier Frias', 'javierasesorias@jcomex.cl', 'JCOMEX'),
  ('Jenny González', 'jennygonzalez@agricolals.com', 'Agrícola LS'),
  ('Jessica Martínez', 'jmartinez@patagonfoods.cl', 'Patagon Foods'),
  ('Jin Amer', 'amer_jm@outlook.com', NULL),
  ('Jorge Salhus', 'jorge.salhus@exportadoravientosdelsur.cl', 'Exportadora Vientos del Sur'),
  ('José Molina', 'ecomex@eltorreon.cl', 'El Torreón'),
  ('Josefa Cardemil', 'jcardemil@alimex.cl', 'ALIMEX'),
  ('Juan Bustamante', 'jbustamante@vifchile.cl', 'VIF Chile'),
  ('Juan Miguel Ovalle', 'jmovalle@apfrut.cl', 'AP Frut'),
  ('Juan Pablo Zhangh', 'jpz@hillvillagroup.com', 'Hillvilla'),
  ('Julio Campillo', 'jcampillo@fruttita.cl', 'Fruttita'),
  ('Kevin Foxley', 'kevin@globalfruit.org', 'GlobalFruit'),
  ('Kevin Muñoz', 'soporte.logistica@copefrut.com', 'Copefrut'),
  ('Leticia Ulloa', 'leticia.ulloa@purenaturecl.com', 'PURE NATURE'),
  ('Logística teno fruit', 'logistica@tenofruit.com', NULL),
  ('Lorenzo León', 'lorenzo@cleequality.com', 'Exportadora Los Lirios'),
  ('Mabel Arancibia', 'comex@exportadoravientosdelsur.cl', 'Exportadora Viento del Sur'),
  ('Magdalena Toro', 'mtoro@xsur.cl', 'X Sur'),
  ('Marcela López', 'marcela.lopez@monfrut.cl', 'Monfrut'),
  ('Marcela Tapia', 'mtapia@bluesea.cl', 'BLUE SEA'),
  ('MARCO MADRIAGA', 'mmadriaga@jotrisa.cl', 'Jotrisa'),
  ('MARCO VERGARA', 'mvergara@jotrisa.cl', 'Jotrisa'),
  ('MARIANO TAPPATA', 'mtappata@pai-argentina.com', 'PAI ARGENTINA'),
  ('Mario Almendra', 'malmendra@valle-maule.cl', 'Valle Maule'),
  ('Mario Bruna', 'mbruna@mjtrading.cl', 'MJ Trading'),
  ('Marisol Navarro', 'marisol.navarro@naturesouth.cl', 'Nature South'),
  ('Marlen Rocha Cea', 'mrochacea@familygrowerschile.cl', NULL),
  ('Marlon Jimenez', 'marlon.jimenez@frutasol.cl', 'Frutasol'),
  ('Matias Benavides', 'matias@mormanagementgroup.com', NULL),
  ('Matias Chavarría', 'mchavarria@marinefarm.cl', 'Marine Farm'),
  ('Matias Unquén', 'munquen@rinofruit.com', 'Rinofruit'),
  ('Matias Veloso', 'matias@fruitsexport.cl', 'Fruits Export'),
  ('Max', 'max@aqua-link.cl', 'AQUALINK'),
  ('May Zhao', 'may@yemete.com', 'Yemete'),
  ('Miguel Angel Lorenzzini', 'miguel@tenofruit.com', 'Teno Fruit'),
  ('MIGUEL HERNANDEZ', 'mhernandez@pai-argentina.com', 'PAI ARGENTINA'),
  ('Miguel Vergara', 'mvergara@redandblueberries.cl', 'Red & Blueberries'),
  ('Miren Eceiza', 'miren.eceiza@primland.fr', 'Primland'),
  ('MIRTA YAÑEZ', 'logistica@expoagrosol.com', 'AGROSOL'),
  ('NICOLAS BONAVENTO', 'nbonavento@mazul.com.ar', 'Moño Azul'),
  ('Nicolas Correa', 'nicolas@fruticolalareserva.com', 'Exportadora La Reserva'),
  ('Nicolhe Meneses', 'nmeneses@rinofruit.com', 'Rinofruit'),
  ('OSVALDO', 'osvaldo.cristian@gmail.com', NULL),
  ('PABLO OSETE', 'p.osete@kleppe.com.ar', 'Kleppe'),
  ('Pablo Pizzarro', 'pablopizarro@yemete.com', 'Yemete'),
  ('Patricia Ruiz', 'patricia.ruiz@vrfoods.cl', 'VR Foods'),
  ('Patricio Borlando', 'pborlando@fruitandesur.cl', 'FRUIT ANDESUR'),
  ('Patricio Carreño', 'pcarreno@greenex.cl', 'Greenex'),
  ('Patricio Pérez', 'patricio.perez@cookeaqua.com', 'Cook Aqua'),
  ('Paula Fuenzalida', 'pfuenzalida@chilfresh.cl', 'Chilfresh'),
  ('René Tempe', 'rene.tampe@ulmoltda.cl', 'ULMO'),
  ('Ricardo Fernández', 'ricardo@exportecoterra.cl', 'Exportadora Ecoterra'),
  ('Ricardo Nuñez', 'rnunez@freshland.cl', 'Fresh Land'),
  ('Rodrigo López', 'rlopez@rinofruit.com', 'Rinofruit'),
  ('Rodrigo Matus', 'rodrigo@vrfoods.cl', 'VR FOODS'),
  ('RODRIGO SOTOMAYOR', 'rodrigo@portalmaule.com', 'PORTAL MAULE (AGROSOL)'),
  ('Romina Sesti', 'rsesti@pft.com.ar', 'Moño Azul'),
  ('S Kahn', 'skahn@albilbao.cl', 'ALIMENTOS BILBAO'),
  ('Sandra Alvarado', 'salvarado@noblefruit.cl', 'Noble Fruit'),
  ('Sebastián Chamblat', 'schamblat@sclem.cl', 'San Clemente'),
  ('Sheila Jackson', 'sheilajackson@agricolals.com', 'Agrícola LS'),
  ('Sussan Pérez', 'sperez@apfrut.cl', 'AP Frut'),
  ('TAMARA NAVARRETE', 'tamara.navarrete@blumar.com', 'Blumar'),
  ('Thomas Graell', 'thomas.graell@monfrut.cl', 'Monfrut'),
  ('VALENTINA MIRANDA', 'vmiranda@blossom.cl', 'Blossom'),
  ('Victor', 'operacionmantencion@hillvillagroup.com', NULL),
  ('VICTOR ANDRAE', 'vandrade@aquachile.com', 'AQUACHILE'),
  ('Víctor Bravo', 'victor.bravo@copefrut.com', 'Copefrut'),
  ('Víctor Maroto', 'victor.maroto@fruttita.cl', 'Fruttita'),
  ('Ximena Navarrete', 'ximena.navarrete@copefrut.com', 'Copefrut'),
  ('Zaid Althafeer', 'zalthafeer@gmail.com', 'Ruta de la Fruta'),
  ('Bryan Zuñiga', 'bryan.zuniga@operman.cl', NULL),
  ('Exequiel Sepúlveda', 'exequiel.sepulveda@operman.cl', NULL),
  ('Oscar Marchant', 'oscar.marchant@operman.cl', NULL)
ON CONFLICT (email) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  empresa = COALESCE(EXCLUDED.empresa, public.informaciones_contactos.empresa),
  activo = true;

-- Reasignar membresías solo según este CSV
DELETE FROM public.informaciones_grupo_miembros;

INSERT INTO public.informaciones_grupo_miembros (grupo_id, contacto_id)
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'CLIENTES BERRIES Y ARANDANOS' AND c.email = 'contacto@aguasanta.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'CLIENTES BERRIES Y ARANDANOS' AND c.email = 'info@frutber.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'CLIENTES BERRIES Y ARANDANOS' AND c.email = 'marketing@northbayproduce.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'CLIENTES BERRIES Y ARANDANOS' AND c.email = 'info@patagoniafruit.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'CLIENTES BERRIES Y ARANDANOS' AND c.email = 'contacto@zuagro.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'alex.cardenas@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'hans.vasquez@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'mario.basaez@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'nina.scotti@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'poliana.cisternas@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'ricardo.lazo@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'rocio.villarroel@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'rodrigo.caceres@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'rodrigo.castillo@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'EQUIPO ASLI' AND c.email = 'stefanie.cordova@asli.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cristiansilva@aisienchina.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'abraham.quezada@naturesouth.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'aweason@redstar.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'acanclini@briza.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'alejandra.gonzalez@salmonesaustral.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'aneira@briza.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'aastudillo@quintayfruit.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'alexis.martinez@goldanda.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'alex.paredes@cermaq.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'alexis.alvarado@oxzo.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'afrias@blossom.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'anaguian@caletabay.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'alfredo@farawayland.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'almafruitexport@gmail.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'alonso.salgado@vrfoods.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'alarrondo@terrafrut.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'andre.courtin@greenex.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'andrea.gonzalez@esperanza-verde.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'ahederra@gmail.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'andres@aqua-link.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'amiranda@jotrisa.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'angelolagos@sglchile.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'gerenciacapci@gmail.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'antonia.oyarzun@copefrut.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'aipinoch@uc.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'antonio.vera@aysenpacific.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'agalleguillos@cylfruit.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'augustofrias@blossom.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'benjamincardoen@sanandresexport.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'ventas@eltorreon.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'bianca.trujillo@naturesouth.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cjarabran@fruitandesur.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'comex@greenex.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'carlos.saa@blumar.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cguzman@coexca.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cecilia.rosas@cookeaqua.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cduarte@chilfresh.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'claudia.huerta@almafruit.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cbahamondes@pompeiatrade.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cfuller@losnobles.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'clopez@fruitandesur.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cristianm@thegrowers.club'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cristian.munoz@mowi.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cpinochet@cindependencia.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'araya.cardenas.cristobal@gmail.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'cristoballozano@agricolals.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'drojas@leice.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'daniel@pai-argentina.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'daniel.saldivia@ulmoltda.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'demancilla@patagoniaoceanfood.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'dvelasquez@multi-xsalmon.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'emontenegro@redandblueberries.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'epezo@integrachile.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'elorda@kleppe.com.ar'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'ertanertas33@gmail.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'facundoquiros@yahoo.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'flarenas@vifchile.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'felipe.quilodran@fiordoaustral.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'fescobar@dfaneuquen.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'fernanda.ortiz@aysenpacific.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'fernando@fruitsexport.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'fdiaz@coexca.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'fastaburuaga@xsur.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'gabriel.ojeda@mowi.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'exportaciones@southwind.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'administracion@pacificseachile.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'hans.leibbrandt@monfrut.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'hdebellis@extraberries.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'joyarzo@acmechile.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'javierasesorias@jcomex.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'jennygonzalez@agricolals.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'jmartinez@patagonfoods.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'amer_jm@outlook.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'jorge.salhus@exportadoravientosdelsur.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'ecomex@eltorreon.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'jcardemil@alimex.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'jbustamante@vifchile.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'jmovalle@apfrut.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'jpz@hillvillagroup.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'jcampillo@fruttita.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'kevin@globalfruit.org'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'soporte.logistica@copefrut.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'leticia.ulloa@purenaturecl.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'logistica@tenofruit.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'lorenzo@cleequality.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'comex@exportadoravientosdelsur.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mtoro@xsur.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'marcela.lopez@monfrut.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mtapia@bluesea.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mmadriaga@jotrisa.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mvergara@jotrisa.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mtappata@pai-argentina.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'malmendra@valle-maule.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mbruna@mjtrading.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'marisol.navarro@naturesouth.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mrochacea@familygrowerschile.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'marlon.jimenez@frutasol.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'matias@mormanagementgroup.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mchavarria@marinefarm.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'munquen@rinofruit.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'matias@fruitsexport.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'max@aqua-link.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'may@yemete.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'miguel@tenofruit.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mhernandez@pai-argentina.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'mvergara@redandblueberries.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'miren.eceiza@primland.fr'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'logistica@expoagrosol.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'nbonavento@mazul.com.ar'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'nicolas@fruticolalareserva.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'nmeneses@rinofruit.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'osvaldo.cristian@gmail.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'p.osete@kleppe.com.ar'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'pablopizarro@yemete.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'patricia.ruiz@vrfoods.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'pborlando@fruitandesur.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'pcarreno@greenex.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'patricio.perez@cookeaqua.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'pfuenzalida@chilfresh.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'rene.tampe@ulmoltda.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'ricardo@exportecoterra.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'rnunez@freshland.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'rlopez@rinofruit.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'rodrigo@vrfoods.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'rodrigo@portalmaule.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'rsesti@pft.com.ar'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'skahn@albilbao.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'salvarado@noblefruit.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'schamblat@sclem.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'sheilajackson@agricolals.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'sperez@apfrut.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'tamara.navarrete@blumar.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'thomas.graell@monfrut.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'vmiranda@blossom.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'operacionmantencion@hillvillagroup.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'vandrade@aquachile.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'victor.bravo@copefrut.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'victor.maroto@fruttita.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'ximena.navarrete@copefrut.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'INFO CLIENTES' AND c.email = 'zalthafeer@gmail.com'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'OPERMAN' AND c.email = 'bryan.zuniga@operman.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'OPERMAN' AND c.email = 'exequiel.sepulveda@operman.cl'
UNION ALL
SELECT g.id AS grupo_id, c.id AS contacto_id FROM public.informaciones_grupos g, public.informaciones_contactos c WHERE g.nombre = 'OPERMAN' AND c.email = 'oscar.marchant@operman.cl'
ON CONFLICT DO NOTHING;
