/**
 * Le rendu d'un corps d'article.
 *
 * Les blocs sont typés et le rendu les traite un par un. C'est la réponse à deux
 * défauts observés ailleurs : un corps stocké en Markdown et affiché tel quel, si
 * bien que le lecteur voit les astérisques, et un corps stocké en HTML, qui expose
 * une injection le jour où quelqu'un obtient le droit de rédiger.
 *
 * Ici rien n'est interprété. Chaque bloc produit un élément connu, et un type
 * inconnu affiche son texte en paragraphe plutôt que de disparaître : un article
 * amputé d'un passage est pire qu'un article un peu terne, parce que le lecteur ne
 * sait pas qu'il manque quelque chose.
 */
import type { Bloc } from "./clientAide";

interface Proprietes {
  readonly blocs: readonly Bloc[];
  /** Ouvre un écran de l'application. Absent, un bloc de lien reste du texte. */
  readonly ouvrirEcran?: (cleEcran: string) => void;
}

export function RenduBlocs({ blocs, ouvrirEcran }: Proprietes) {
  if (blocs.length === 0) {
    return (
      <p className="aide-vide">
        Cet article n&apos;a pas encore de contenu publié.
      </p>
    );
  }
  return (
    <div className="aide-corps">
      {blocs.map((bloc, rang) => (
        <UnBloc key={rang} bloc={bloc} ouvrirEcran={ouvrirEcran} />
      ))}
    </div>
  );
}

function UnBloc({
  bloc,
  ouvrirEcran,
}: {
  readonly bloc: Bloc;
  readonly ouvrirEcran?: (cleEcran: string) => void;
}) {
  switch (bloc.type) {
    case "etapes":
      // Une liste numérotée seulement quand l'ordre porte une information, ce qui
      // est le cas d'une marche à suivre et seulement de celle-là.
      return (
        <ol className="aide-etapes">
          {bloc.elements.map((element, rang) => (
            <li key={rang}>{element}</li>
          ))}
        </ol>
      );

    case "points":
      return (
        <ul className="aide-points">
          {bloc.elements.map((element, rang) => (
            <li key={rang}>{element}</li>
          ))}
        </ul>
      );

    case "avertissement":
      return (
        <p className="aide-avertissement" role="note">
          {bloc.texte}
        </p>
      );

    case "formule":
      // Le calcul tel qu'il est fait, pour que le lecteur puisse refaire le total
      // à la main plutôt que de croire un chiffre sur parole.
      return <pre className="aide-formule">{bloc.texte}</pre>;

    case "lien_ecran":
      if (ouvrirEcran === undefined || bloc.ecran === "") {
        return <p className="aide-paragraphe">{bloc.texte}</p>;
      }
      return (
        <p className="aide-paragraphe">
          <button
            type="button"
            className="aide-lien-ecran"
            onClick={() => ouvrirEcran(bloc.ecran)}
          >
            {bloc.texte === "" ? "Ouvrir cet écran" : bloc.texte}
          </button>
        </p>
      );

    default:
      return <p className="aide-paragraphe">{bloc.texte}</p>;
  }
}
