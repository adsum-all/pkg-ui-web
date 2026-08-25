/**
 * Le bouton d'aide d'un écran, et le tiroir qu'il ouvre.
 *
 * Un seul composant à poser dans une application : il tient l'état d'ouverture,
 * ce qui évite que chaque écran réinvente le même booléen et oublie la moitié des
 * comportements de fermeture.
 *
 * Le libellé est visible et non réduit à un point d'interrogation. Une icône seule
 * ne dit pas ce qu'elle fait à qui ne la connaît pas, et c'est exactement le lecteur
 * visé.
 */
import { useState } from "react";

import type { ClientAide } from "./clientAide";
import { TiroirAide } from "./TiroirAide";

interface Proprietes {
  readonly client: ClientAide;
  readonly cleEcran: string;
  readonly libelle?: string;
  readonly ouvrirEcran?: (cleEcran: string) => void;
  readonly onEscalade?: (contexte: { cleEcran: string; requete: string; article: string }) => void;
}

export function BoutonAide({
  client,
  cleEcran,
  libelle = "Aide",
  ouvrirEcran,
  onEscalade,
}: Proprietes) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <button
        type="button"
        className="aide-bouton"
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
      >
        {libelle}
      </button>
      <TiroirAide
        client={client}
        cleEcran={cleEcran}
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        ouvrirEcran={ouvrirEcran}
        onEscalade={onEscalade}
      />
    </>
  );
}
