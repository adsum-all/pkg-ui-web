/**
 * La clé d'écran, dérivée et non saisie.
 *
 * Une clé écrite à la main dans chaque composant se désynchronise du jour où une
 * section est renommée : l'ancre reste, l'écran change de nom, et le tiroir s'ouvre
 * vide sans que rien ne le signale. Ici la clé se compose du code d'application et
 * de l'identifiant de section que l'application utilise déjà pour sa navigation,
 * ceux que le back-office valide contre SECTION_IDS et que le pilotage tient dans
 * son MENU.
 *
 * La forme est stable et lisible : `back-office.membres`. Elle sert de clé dans la
 * table d'ancrage, donc elle doit survivre à un redéploiement, ce qu'un identifiant
 * technique ne fait pas.
 */

/** Ce que les identifiants de section ont le droit de contenir. */
const CARACTERES_VALIDES = /[^a-z0-9-]+/g;

export function cleEcran(application: string, section: string): string {
  const app = normaliser(application);
  const partie = normaliser(section);
  if (app === "") return "";
  return partie === "" ? `${app}.accueil` : `${app}.${partie}`;
}

/**
 * La clé lue depuis le fragment d'adresse, pour les applications servies en
 * fichiers statiques qui n'embarquent aucune bibliothèque de routage.
 *
 * Le fragment `#/membres/12` donne `membres` : le segment de tête est la section,
 * ce qui suit identifie une ligne et ne change pas l'écran dont on parle.
 */
export function cleEcranDepuisFragment(application: string, fragment: string): string {
  const nettoye = fragment.replace(/^#/, "").replace(/^\//, "");
  const premier = nettoye.split(/[/?]/)[0] ?? "";
  return cleEcran(application, premier);
}

function normaliser(valeur: string): string {
  return valeur
    .trim()
    .toLowerCase()
    .replace(CARACTERES_VALIDES, "-")
    .replace(/^-+|-+$/g, "");
}
