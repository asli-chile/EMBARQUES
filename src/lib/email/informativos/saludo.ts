/** Saludo formal Estimado/Estimada según primer nombre (español/Chile). */

const MALE = new Set(
  [
    "aaron","abraham","adam","adrian","agustin","alan","alberto","alejandro","alex",
    "alexander","alfonso","alfredo","alonso","alvaro","andres","angel","anthony",
    "antonio","ariel","armando","arturo","benjamin","benito","bernardo","bruno",
    "carlos","cesar","christian","christopher","claudio","cristian","cristobal",
    "daniel","dante","david","diego","dominic","edgar","eduardo","elias","emilio",
    "emmanuel","enrique","eric","ernesto","esteban","ethan","eugenio","evan",
    "fabian","facundo","felipe","felix","fernando","francisco","franco","gabriel",
    "gaspar","german","giovanni","gonzalo","gregorio","guillermo","gustavo","hector",
    "hernan","hugo","ian","ignacio","iker","isaac","ivan","jacob","jaime","javier",
    "jeronimo","jesus","joaquin","joel","john","jonas","jonathan","jorge","jose",
    "josue","juan","julian","julio","kevin","leonardo","lorenzo","lucas","luciano",
    "luis","manuel","marcelo","marco","marcos","mariano","mario","martin","mateo",
    "matias","mauricio","max","maximiliano","miguel","nelson","nicolas","noah",
    "oscar","pablo","patricio","pedro","rafael","ramon","raul","renato","ricardo",
    "roberto","rodolfo","rodrigo","roman","ruben","salvador","samuel","santiago",
    "sebastian","sergio","simon","tomas","vicente","victor","william","xavier",
    "yago","zachary",
  ].map((n) => n),
);

const FEMALE = new Set(
  [
    "abril","adriana","agustina","ainara","aitana","alejandra","alexandra","alice",
    "alicia","amanda","ana","andrea","angela","angeles","antonella","antonia",
    "aurora","barbara","beatriz","belen","blanca","camila","carla","carmen","carolina",
    "catalina","cecilia","celeste","claudia","constanza","cristina","daniela","diana",
    "elena","elisa","elizabeth","emily","emma","erika","esperanza","estefania","eugenia",
    "eva","fatima","fernanda","florencia","francisca","gabriela","gloria","ines",
    "irene","isabel","isidora","jennifer","jessica","jimena","josefa","josefina",
    "juana","julia","karina","karla","laura","leticia","lidia","lorena","lucia",
    "luciana","luisa","luz","macarena","magdalena","maite","manuela","marcela",
    "margarita","maria","mariana","marina","marisol","marta","martina","melissa",
    "michelle","milagros","miriam","monica","natalia","nicole","noelia","norma",
    "olivia","paloma","paola","patricia","paulina","paz","pilar","rafaela","raquel",
    "rebeca","renata","rocio","rosa","rosario","sandra","sara","silvia","sofia",
    "soledad","stephanie","susana","tamara","tere","teresa","trinidad","valentina",
    "valeria","veronica","victoria","virginia","viviana","ximena","yasna","yesenia",
  ].map((n) => n),
);

/** Nombres en -a que son masculinos. */
const MALE_ENDING_A = new Set(
  ["joshua","juda","luca","matias","elias","tomas","nicolas","sebastian"].map((n) => n),
);

function normalizeName(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z]/g, "") ?? "";
}

export type SaludoFormal = "Estimado" | "Estimada";

/**
 * Infiera trato formal. Ante duda usa "Estimado" (evita "Estimada Rodrigo").
 */
export function saludoDesdeNombre(nombre: string): SaludoFormal {
  const n = normalizeName(nombre);
  if (!n) return "Estimado";
  if (MALE.has(n)) return "Estimado";
  if (FEMALE.has(n)) return "Estimada";
  if (n.endsWith("a") && !MALE_ENDING_A.has(n)) return "Estimada";
  return "Estimado";
}

export function mergePlantilla(
  text: string,
  vars: { nombre: string; saludo?: SaludoFormal },
): string {
  const saludo = vars.saludo ?? saludoDesdeNombre(vars.nombre);
  return text
    .replace(/\bEstimad[oa]\s*\{\{\s*nombre\s*\}\}/gi, `${saludo} ${vars.nombre}`)
    .replace(/\{\{\s*saludo\s*\}\}/gi, saludo)
    .replace(/\{\{\s*nombre\s*\}\}/gi, vars.nombre);
}
