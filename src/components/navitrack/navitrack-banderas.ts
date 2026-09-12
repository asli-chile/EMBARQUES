/**
 * Bandera del país de origen y destino.
 *
 * El destino sale de `operaciones.pais`, que el ERP ya registra. El origen se
 * deduce del puerto: en este ERP los POL son chilenos salvo excepciones, y para
 * las que no estén en la lista simplemente no se muestra bandera — preferible a
 * arriesgar una bandera equivocada, que en logística internacional se nota.
 */

const PAIS_ISO: Record<string, string> = {
  ALEMANIA: "DE",
  "ARABIA SAUDITA": "SA",
  ARGENTINA: "AR",
  AUSTRALIA: "AU",
  BELGICA: "BE",
  BRASIL: "BR",
  CANADA: "CA",
  CHILE: "CL",
  CHINA: "CN",
  COLOMBIA: "CO",
  "COREA DEL SUR": "KR",
  COREA: "KR",
  "COSTA RICA": "CR",
  DINAMARCA: "DK",
  ECUADOR: "EC",
  EGIPTO: "EG",
  "EL SALVADOR": "SV",
  "EMIRATOS ARABES UNIDOS": "AE",
  ESPANA: "ES",
  "ESTADOS UNIDOS": "US",
  EEUU: "US",
  USA: "US",
  FILIPINAS: "PH",
  FINLANDIA: "FI",
  FRANCIA: "FR",
  GRECIA: "GR",
  GUATEMALA: "GT",
  HOLANDA: "NL",
  "HONG KONG": "HK",
  INDIA: "IN",
  INDONESIA: "ID",
  INGLATERRA: "GB",
  ISRAEL: "IL",
  ITALIA: "IT",
  JAPON: "JP",
  MALASIA: "MY",
  MARRUECOS: "MA",
  MEXICO: "MX",
  NORUEGA: "NO",
  "NUEVA ZELANDA": "NZ",
  "PAISES BAJOS": "NL",
  PANAMA: "PA",
  PERU: "PE",
  POLONIA: "PL",
  PORTUGAL: "PT",
  "REINO UNIDO": "GB",
  "REPUBLICA DOMINICANA": "DO",
  RUSIA: "RU",
  SINGAPUR: "SG",
  SUDAFRICA: "ZA",
  SUECIA: "SE",
  TAILANDIA: "TH",
  TAIWAN: "TW",
  TURQUIA: "TR",
  URUGUAY: "UY",
  VIETNAM: "VN",
};

/** Puertos de embarque conocidos y su país. */
const PUERTO_ISO: Record<string, string> = {
  VALPARAISO: "CL",
  VAP: "CL",
  "SAN ANTONIO": "CL",
  SAI: "CL",
  LIRQUEN: "CL",
  CORONEL: "CL",
  TALCAHUANO: "CL",
  QUINTERO: "CL",
  IQUIQUE: "CL",
  ANTOFAGASTA: "CL",
  ARICA: "CL",
  COQUIMBO: "CL",
  "PUERTO ANGAMOS": "CL",
  MEJILLONES: "CL",
  "PUERTO MONTT": "CL",
  CHACABUCO: "CL",
  "PUNTA ARENAS": "CL",
  CALLAO: "PE",
  GUAYAQUIL: "EC",
  BUENAVENTURA: "CO",
  CARTAGENA: "CO",
  BALBOA: "PA",
  CRISTOBAL: "PA",
  "MANZANILLO PANAMA": "PA",
  COLON: "PA",
  // ─── Destinos. Sin estos, la columna Ruta solo mostraba bandera de origen ───
  HAMBURGO: "DE",
  HAMBURG: "DE",
  BREMERHAVEN: "DE",
  ROTTERDAM: "NL",
  AMBERES: "BE",
  ANTWERP: "BE",
  ZEEBRUGGE: "BE",
  LEIXOES: "PT",
  LISBOA: "PT",
  SINES: "PT",
  GENOA: "IT",
  GENOVA: "IT",
  "GIOIA TAURO": "IT",
  LIVORNO: "IT",
  "LA SPEZIA": "IT",
  SALERNO: "IT",
  VADO: "IT",
  "FOS SUR MER": "FR",
  FOS: "FR",
  "LE HAVRE": "FR",
  MARSELLA: "FR",
  DUNKERQUE: "FR",
  VALENCIA: "ES",
  BARCELONA: "ES",
  ALGECIRAS: "ES",
  BILBAO: "ES",
  VIGO: "ES",
  CADIZ: "ES",
  LONDRES: "GB",
  LONDON: "GB",
  FELIXSTOWE: "GB",
  TILBURY: "GB",
  SOUTHAMPTON: "GB",
  SEATTLE: "US",
  TACOMA: "US",
  "LOS ANGELES": "US",
  "LONG BEACH": "US",
  OAKLAND: "US",
  FILADELFIA: "US",
  PHILADELPHIA: "US",
  "NEW YORK": "US",
  "NUEVA YORK": "US",
  MIAMI: "US",
  HOUSTON: "US",
  CHARLESTON: "US",
  SAVANNAH: "US",
  WILMINGTON: "US",
  "PORT EVERGLADES": "US",
  VANCOUVER: "CA",
  MONTREAL: "CA",
  TOKYO: "JP",
  TOKIO: "JP",
  YOKOHAMA: "JP",
  KOBE: "JP",
  OSAKA: "JP",
  NAGOYA: "JP",
  SHANGHAI: "CN",
  NINGBO: "CN",
  SHENZHEN: "CN",
  QINGDAO: "CN",
  XINGANG: "CN",
  DALIAN: "CN",
  "HONG KONG": "HK",
  BUSAN: "KR",
  PUSAN: "KR",
  KAOHSIUNG: "TW",
  KEELUNG: "TW",
  SINGAPUR: "SG",
  SINGAPORE: "SG",
  "PORT KLANG": "MY",
  TANJUNG: "MY",
  "JEBEL ALI": "AE",
  DUBAI: "AE",
  DAMMAM: "SA",
  JEDDAH: "SA",
  "NOVOROSSIYSK": "RU",
  "SAN PETERSBURGO": "RU",
  SANTOS: "BR",
  PARANAGUA: "BR",
  ITAPOA: "BR",
  NAVEGANTES: "BR",
  "RIO GRANDE": "BR",
  "BUENOS AIRES": "AR",
  MONTEVIDEO: "UY",
  "PUERTO CABELLO": "VE",
  KINGSTON: "JM",
  CAUCEDO: "DO",
  "PUERTO LIMON": "CR",
  MOIN: "CR",
  VERACRUZ: "MX",
  MANZANILLO: "MX",
  LAZARO: "MX",
  DURBAN: "ZA",
  "CIUDAD DEL CABO": "ZA",
  "CAPE TOWN": "ZA",
  SYDNEY: "AU",
  MELBOURNE: "AU",
  AUCKLAND: "NZ",
};

function normalizar(s: string | null | undefined): string {
  return String(s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ISO 3166-1 alfa-2 a emoji, sumando 127397 a cada letra (indicadores regionales). */
function isoAEmoji(iso: string): string {
  return String.fromCodePoint(...[...iso].map((c) => c.charCodeAt(0) + 127397));
}

/** Bandera del país tal como lo guarda `operaciones.pais`. Null si no se reconoce. */
export function banderaDePais(pais: string | null | undefined): string | null {
  const iso = PAIS_ISO[normalizar(pais)];
  return iso ? isoAEmoji(iso) : null;
}

/** Bandera deducida del nombre del puerto. Null si no está en la lista. */
export function banderaDePuerto(puerto: string | null | undefined): string | null {
  const iso = PUERTO_ISO[normalizar(puerto)];
  return iso ? isoAEmoji(iso) : null;
}

/*
 * Código ISO en vez del emoji.
 *
 * Los emoji de bandera se arman con dos "indicadores regionales" y dependen de
 * que el sistema tenga una fuente que los combine. Windows no la trae: en vez
 * de la bandera de Chile se ve un literal "CL", que es peor que no mostrar
 * nada. Con el código ISO la pantalla puede dibujar un SVG, que se ve igual en
 * todas partes.
 */
export function isoDePuerto(puerto: string | null | undefined): string | null {
  return PUERTO_ISO[normalizar(puerto)] ?? null;
}

export function isoDePais(pais: string | null | undefined): string | null {
  return PAIS_ISO[normalizar(pais)] ?? null;
}
