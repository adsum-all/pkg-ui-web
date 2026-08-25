/**
 * Le centre d'aide en page pleine.
 *
 * Le même composant sert le guichet central et le centre d'une application : ce qui
 * change est la configuration du client, avec ou sans code d'application. Il n'y a
 * donc qu'un corpus, et rien à tenir en cohérence entre deux catalogues.
 *
 * Une seule zone de recherche à l'écran. Deux zones donnent deux états à tenir en
 * accord, et l'une des deux finit par chercher dans le mauvais périmètre.
 */
import { useCallback, useEffect, useId, useState } from "react";

import type { Article, ArticleResume, ClientAide, Rubrique } from "./clientAide";
import { RenduBlocs } from "./RenduBlocs";

const ATTENTE_FRAPPE_MS = 250;

interface Proprietes {
  readonly client: ClientAide;
  /** Titre de la page. Le guichet central et une application ne s'annoncent pas pareil. */
  readonly titre?: string;
  readonly ouvrirEcran?: (cleEcran: string) => void;
  readonly onEscalade?: (contexte: { requete: string; article: string }) => void;
}

export function PageAide({
  client,
  titre = "Centre d'aide",
  ouvrirEcran,
  onEscalade,
}: Proprietes) {
  const [rubriques, setRubriques] = useState<readonly Rubrique[]>([]);
  const [rubriqueActive, setRubriqueActive] = useState("");
  const [resumes, setResumes] = useState<readonly ArticleResume[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [terme, setTerme] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const idRecherche = useId();

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const liste = await client.rubriques();
        if (vivant) setRubriques(liste);
      } catch {
        if (vivant) setErreur("Le centre d'aide n'a pas pu être chargé.");
      }
    })();
    return () => {
      vivant = false;
    };
  }, [client]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      const propre = terme.trim();
      if (propre.length >= 2) {
        const trouves = await client.recherche(propre);
        setResumes(trouves);
        void client.signaler({ type: "recherche", requete: propre, resultats: trouves.length });
        return;
      }
      setResumes(await client.articles(rubriqueActive));
    } catch {
      setErreur("Le centre d'aide n'a pas pu être chargé.");
      setResumes([]);
    } finally {
      setChargement(false);
    }
  }, [client, rubriqueActive, terme]);

  useEffect(() => {
    const minuterie = window.setTimeout(() => void charger(), terme === "" ? 0 : ATTENTE_FRAPPE_MS);
    return () => window.clearTimeout(minuterie);
  }, [charger, terme]);

  async function ouvrirArticle(cle: string) {
    setChargement(true);
    try {
      const complet = await client.article(cle);
      setArticle(complet);
      void client.signaler({ type: "lecture", article: cle });
    } catch {
      setErreur("Cet article n'a pas pu être ouvert.");
    } finally {
      setChargement(false);
    }
  }

  const recherche = terme.trim().length >= 2;

  return (
    <div className="aide-page">
      <header className="aide-page__entete">
        <h1>{titre}</h1>
        <form className="aide-recherche" role="search" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor={idRecherche} className="aide-hors-ecran">
            Rechercher dans l&apos;aide
          </label>
          <input
            id={idRecherche}
            type="search"
            value={terme}
            onChange={(evenement) => {
              setTerme(evenement.target.value);
              setArticle(null);
            }}
            placeholder="Que cherchez-vous ?"
            autoComplete="off"
            enterKeyHint="search"
          />
        </form>
      </header>

      <div className="aide-page__corps">
        <nav className="aide-page__rubriques" aria-label="Rubriques d'aide">
          <button
            type="button"
            className={rubriqueActive === "" ? "actif" : ""}
            onClick={() => {
              setRubriqueActive("");
              setArticle(null);
            }}
          >
            Tout
          </button>
          {rubriques.map((rubrique) => (
            <button
              key={rubrique.code}
              type="button"
              className={rubriqueActive === rubrique.code ? "actif" : ""}
              onClick={() => {
                setRubriqueActive(rubrique.code);
                setTerme("");
                setArticle(null);
              }}
            >
              {rubrique.titre}
              {/* Le nombre vient du serveur et compte ce que ce lecteur peut ouvrir,
                  pas ce que la rubrique contient. Afficher le second promettrait des
                  articles qui n'apparaîtront jamais. */}
              <span className="aide-page__compte">{rubrique.articles}</span>
            </button>
          ))}
        </nav>

        <main className="aide-page__contenu">
          {erreur !== "" && (
            <p className="aide-erreur" role="alert">
              {erreur}
            </p>
          )}
          {chargement && <p className="aide-attente">Chargement...</p>}

          {article !== null ? (
            <article className="aide-article">
              <button type="button" className="aide-retour" onClick={() => setArticle(null)}>
                Retour
              </button>
              <h2>{article.titre}</h2>
              <RenduBlocs blocs={article.blocs} ouvrirEcran={ouvrirEcran} />
            </article>
          ) : (
            <ul className="aide-liste">
              {resumes.map((resume) => (
                <li key={resume.cle}>
                  <button type="button" onClick={() => void ouvrirArticle(resume.cle)}>
                    <span className="aide-liste__titre">{resume.titre}</span>
                    {resume.extrait !== "" && (
                      <span className="aide-liste__extrait">{resume.extrait}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!chargement && erreur === "" && resumes.length === 0 && article === null && (
            <div className="aide-rien">
              <p>
                {recherche
                  ? "Aucun article ne répond à cette recherche."
                  : "Cette rubrique ne contient encore aucun article."}
              </p>
              {onEscalade !== undefined && recherche && (
                <button
                  type="button"
                  className="aide-escalade"
                  onClick={() => {
                    void client.signaler({ type: "escalade", requete: terme.trim() });
                    onEscalade({ requete: terme.trim(), article: "" });
                  }}
                >
                  Poser la question au support
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
