/**
 * Le tiroir d'aide contextuelle : ce qui répond à l'écran où l'on se trouve.
 *
 * C'est la pièce qui distingue un centre d'aide d'un catalogue. Un catalogue range
 * des articles par rubrique et laisse le lecteur chercher la page qu'il a déjà sous
 * les yeux. Le tiroir part de la clé d'écran et propose d'abord ce qui la concerne.
 *
 * Trois portées, dans cet ordre, et jamais deux corpus : l'écran, puis
 * l'application, puis tout ADSUM. Une recherche sans résultat propose l'ouverture
 * d'une demande de support, parce que c'est le moment précis où la personne allait
 * abandonner.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { Article, ArticleResume, ClientAide } from "./clientAide";
import { RenduBlocs } from "./RenduBlocs";

/** Le temps d'arrêt de frappe avant d'interroger le serveur. */
const ATTENTE_FRAPPE_MS = 250;

type Portee = "ecran" | "application" | "tout";

interface Proprietes {
  readonly client: ClientAide;
  /** La clé de l'écran courant, de la forme application.section. */
  readonly cleEcran: string;
  readonly ouvert: boolean;
  readonly onFermer: () => void;
  readonly ouvrirEcran?: (cleEcran: string) => void;
  /** Ouvre une demande de support pré-remplie. Absent, le bouton n'apparaît pas. */
  readonly onEscalade?: (contexte: { cleEcran: string; requete: string; article: string }) => void;
}

export function TiroirAide({
  client,
  cleEcran,
  ouvert,
  onFermer,
  ouvrirEcran,
  onEscalade,
}: Proprietes) {
  const [portee, setPortee] = useState<Portee>("ecran");
  const [resumes, setResumes] = useState<readonly ArticleResume[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [terme, setTerme] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [avisDonne, setAvisDonne] = useState(false);

  const panneau = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const idTitre = useId();

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      const propre = terme.trim();
      if (propre.length >= 2) {
        const trouves = await client.recherche(propre);
        setResumes(trouves);
        // La recherche infructueuse est le seul signal qui dise quel article
        // écrire ensuite. Elle est enregistrée, jamais affichée en retour.
        void client.signaler({
          type: "recherche",
          cle_ecran: cleEcran,
          requete: propre,
          resultats: trouves.length,
        });
        return;
      }
      if (portee === "ecran") {
        setResumes(await client.parEcran(cleEcran));
        return;
      }
      setResumes(await client.articles());
    } catch {
      setErreur("L'aide n'a pas pu être chargée. Réessayez dans un instant.");
      setResumes([]);
    } finally {
      setChargement(false);
    }
  }, [client, cleEcran, portee, terme]);

  // Rechargement à l'ouverture, au changement d'écran, de portée, et après une
  // pause de frappe. Interroger le serveur à chaque caractère produirait une rafale
  // de requêtes dont seule la dernière compte.
  useEffect(() => {
    if (!ouvert) return undefined;
    const minuterie = window.setTimeout(() => void charger(), terme === "" ? 0 : ATTENTE_FRAPPE_MS);
    return () => window.clearTimeout(minuterie);
  }, [ouvert, charger, terme]);

  // Un tiroir qui s'ouvre sur l'article d'hier désoriente : chaque ouverture
  // repart de l'écran courant.
  useEffect(() => {
    if (!ouvert) return;
    setArticle(null);
    setPortee("ecran");
    setTerme("");
    setAvisDonne(false);
    void client.signaler({ type: "ouverture", cle_ecran: cleEcran });
    champ.current?.focus();
  }, [ouvert, cleEcran, client]);

  useEffect(() => {
    if (!ouvert) return undefined;
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") {
        evenement.stopPropagation();
        onFermer();
      }
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert, onFermer]);

  async function ouvrirArticle(cle: string) {
    setChargement(true);
    setErreur("");
    setAvisDonne(false);
    try {
      const complet = await client.article(cle);
      setArticle(complet);
      void client.signaler({ type: "lecture", cle_ecran: cleEcran, article: cle });
    } catch {
      setErreur("Cet article n'a pas pu être ouvert.");
    } finally {
      setChargement(false);
    }
  }

  function donnerAvis(utile: boolean) {
    setAvisDonne(true);
    void client.signaler({
      type: "avis",
      cle_ecran: cleEcran,
      article: article?.cle ?? "",
      utile,
    });
  }

  if (!ouvert) return null;

  const rienTrouve = !chargement && erreur === "" && resumes.length === 0 && article === null;

  return (
    <div className="aide-voile" onClick={onFermer} role="presentation">
      <div
        ref={panneau}
        className="aide-tiroir"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        onClick={(evenement) => evenement.stopPropagation()}
      >
        <header className="aide-tiroir__entete">
          <h2 id={idTitre}>Aide</h2>
          <button type="button" className="aide-fermer" onClick={onFermer}>
            Fermer
          </button>
        </header>

        <form className="aide-recherche" role="search" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor={`${idTitre}-q`} className="aide-hors-ecran">
            Rechercher dans l&apos;aide
          </label>
          <input
            ref={champ}
            id={`${idTitre}-q`}
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

        <div className="aide-tiroir__corps">
          {chargement && <p className="aide-attente">Chargement...</p>}
          {erreur !== "" && (
            <p className="aide-erreur" role="alert">
              {erreur}
            </p>
          )}

          {article !== null ? (
            <article className="aide-article">
              <button type="button" className="aide-retour" onClick={() => setArticle(null)}>
                Retour à la liste
              </button>
              <h3>{article.titre}</h3>
              <RenduBlocs blocs={article.blocs} ouvrirEcran={ouvrirEcran} />
              {avisDonne ? (
                <p className="aide-merci">Merci, c&apos;est noté.</p>
              ) : (
                <div className="aide-avis">
                  <span>Cette page vous a-t-elle aidé ?</span>
                  <button type="button" onClick={() => donnerAvis(true)}>
                    Oui
                  </button>
                  <button type="button" onClick={() => donnerAvis(false)}>
                    Non
                  </button>
                </div>
              )}
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

          {rienTrouve && (
            <div className="aide-rien">
              <p>
                {terme.trim() === ""
                  ? "Aucune aide n'est encore rattachée à cet écran."
                  : "Aucun article ne répond à cette recherche."}
              </p>
              {onEscalade !== undefined && (
                <button
                  type="button"
                  className="aide-escalade"
                  onClick={() => {
                    void client.signaler({
                      type: "escalade",
                      cle_ecran: cleEcran,
                      requete: terme.trim(),
                    });
                    // Aucun article n'est ouvert ici par construction : ce bloc ne
                    // s'affiche que lorsque la liste est vide.
                    onEscalade({ cleEcran, requete: terme.trim(), article: "" });
                  }}
                >
                  Poser la question au support
                </button>
              )}
            </div>
          )}
        </div>

        {article === null && (
          <footer className="aide-tiroir__pied">
            {/* La portée s'élargit par palier. Sauter directement au corpus complet
                noierait la réponse locale dans tout ADSUM. */}
            <button
              type="button"
              className={portee === "ecran" ? "actif" : ""}
              onClick={() => setPortee("ecran")}
            >
              Cet écran
            </button>
            <button
              type="button"
              className={portee === "application" || portee === "tout" ? "actif" : ""}
              onClick={() => setPortee("application")}
            >
              Toute l&apos;application
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
