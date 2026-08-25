// Recopie la feuille de style dans dist. Le CSS n'est pas compilé par tsc, et un
// paquet publié sans sa feuille rend des composants sans aucune mise en forme, ce
// qui se voit à l'exécution et jamais à la compilation.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ici = dirname(fileURLToPath(import.meta.url));
const source = resolve(ici, "../src/aide/aide.css");
const cible = resolve(ici, "../dist/aide.css");
mkdirSync(dirname(cible), { recursive: true });
copyFileSync(source, cible);
console.log(`aide.css copie vers ${cible}`);
