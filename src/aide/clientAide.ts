/**
 * Le client du centre d'aide. Une seule façon d'appeler l'API, pour les dix
 * applications.
 *
 * Ce fichier ne contient aucune phrase d'aide, et c'est la règle qui gouverne tout
 * le paquet. Une coquille partagée se met à jour par montée de version puis
 * réinstallation dans chaque application : mettre un texte ici coûterait dix
 * redéploiements pour corriger une faute de frappe. Tout ce qui varie, le contenu,
 * les ancrages, l'ordre, les libellés et la langue, vient du serveur.
 *
 * Le jeton est fourni par l'application, jamais lu ici : chacune le range où elle a
 * décidé de le ranger, la console en session et le back-office en stockage local, et
 * une bibliothèque qui irait le chercher elle-même casserait chez l'une des deux.
 */

export interface Rubrique {
  readonly code: string;
  readonly titre: string;
  readonly description: string;
  readonly application_code: string;
  readonly ordre: number;
  readonly articles: number;
}

export interface ArticleResume {
  readonly cle: string;
  readonly slug: string;
  readonly titre: string;
  readonly extrait: string;
  readonly rubrique: string;
  readonly application_code: string;
  readonly ordre: number;
}

/** Un bloc typé. Jamais du HTML libre, jamais du Markdown affiché tel quel. */
export interface Bloc {
  readonly type: "paragraphe" | "etapes" | "points" | "avertissement" | "formule" | "lien_ecran";
  readonly texte: string;
  readonly elements: readonly string[];
  readonly ecran: string;
}

export interface Article extends ArticleResume {
  readonly blocs: readonly Bloc[];
  readonly version: number;
  readonly publie_le: string | null;
}

export type TypeUsage = "ouverture" | "recherche" | "lecture" | "avis" | "escalade";

export interface Usage {
  readonly type: TypeUsage;
  readonly application?: string;
  readonly cle_ecran?: string;
  readonly article?: string;
  readonly requete?: string;
  readonly resultats?: number;
  readonly utile?: boolean;
  readonly commentaire?: string;
}

export interface ConfigurationAide {
  /** La racine de l'API, sans barre finale. */
  readonly api: string;
  /** Le code de l'application hôte. Absent, la portée est le guichet central. */
  readonly application?: string;
  /** Rend le jeton courant, ou une chaîne vide. Appelé à chaque requête. */
  readonly jeton?: () => string;
  readonly langue?: string;
}

export class ErreurAide extends Error {
  constructor(
    message: string,
    readonly statut: number,
  ) {
    super(message);
    this.name = "ErreurAide";
  }
}

export class ClientAide {
  constructor(private readonly config: ConfigurationAide) {}

  private async lire<T>(chemin: string, parametres: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.config.api.replace(/\/$/, "")}/api/v1/aide/${chemin}`);
    if (this.config.application !== undefined) {
      url.searchParams.set("application", this.config.application);
    }
    url.searchParams.set("langue", this.config.langue ?? "fr");
    for (const [cle, valeur] of Object.entries(parametres)) {
      if (valeur !== "") url.searchParams.set(cle, valeur);
    }

    const jeton = this.config.jeton?.() ?? "";
    const reponse = await fetch(url.toString(), {
      headers: jeton === "" ? {} : { Authorization: `Bearer ${jeton}` },
    });
    if (!reponse.ok) {
      // Le message reste général : l'API répond la même chose pour un article
      // absent et pour un article qu'on n'a pas le droit de lire, et distinguer
      // les deux ici annulerait cette précaution.
      throw new ErreurAide(
        reponse.status === 404
          ? "Cette page d'aide n'existe pas ou ne vous est pas accessible."
          : "L'aide n'a pas pu être chargée.",
        reponse.status,
      );
    }
    return (await reponse.json()) as T;
  }

  rubriques(): Promise<Rubrique[]> {
    return this.lire<Rubrique[]>("rubriques");
  }

  articles(rubrique = ""): Promise<ArticleResume[]> {
    return this.lire<ArticleResume[]>("articles", { rubrique });
  }

  article(cle: string): Promise<Article> {
    return this.lire<Article>(`articles/${encodeURIComponent(cle)}`);
  }

  /** Ce qui répond à l'écran courant. Le cœur de l'aide contextuelle. */
  parEcran(cleEcran: string): Promise<ArticleResume[]> {
    return this.lire<ArticleResume[]>(`ecran/${encodeURIComponent(cleEcran)}`);
  }

  recherche(terme: string): Promise<ArticleResume[]> {
    const propre = terme.trim();
    // Le serveur refuse déjà en deçà de deux caractères. Le vérifier ici évite un
    // aller-retour par frappe pendant que la personne commence à écrire.
    if (propre.length < 2) return Promise.resolve([]);
    return this.lire<ArticleResume[]>("recherche", { q: propre });
  }

  /**
   * Signaler un usage. Volontairement silencieux en cas d'échec.
   *
   * La mesure ne doit jamais empêcher la lecture : un compteur qui casse la page
   * d'aide transforme une gêne en panne, sur l'écran exact où la personne était
   * déjà en difficulté.
   */
  async signaler(usage: Usage): Promise<void> {
    try {
      const jeton = this.config.jeton?.() ?? "";
      await fetch(`${this.config.api.replace(/\/$/, "")}/api/v1/aide/usage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jeton === "" ? {} : { Authorization: `Bearer ${jeton}` }),
        },
        body: JSON.stringify({
          application: this.config.application ?? "",
          ...usage,
        }),
      });
    } catch {
      /* Sans effet visible, par construction. */
    }
  }
}
