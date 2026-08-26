/**
 * Ce que le client d'aide envoie réellement sur le réseau, et la clé d'écran.
 *
 * Ces deux pièces se vérifient sans navigateur, et ce sont elles qui cassent en
 * silence : une clé d'écran mal formée ouvre un tiroir vide, et un paramètre oublié
 * dans l'adresse fait servir le mauvais périmètre sans qu'aucune erreur ne
 * s'affiche.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientAide, ErreurAide } from "../src/aide/clientAide";
import { cleEcran, cleEcranDepuisFragment } from "../src/aide/registreAide";

interface AppelObserve {
  readonly url: string;
  readonly entetes: Record<string, string>;
  readonly corps: string;
}

function poserReseau(reponse: unknown = [], statut = 200): AppelObserve[] {
  const appels: AppelObserve[] = [];
  vi.stubGlobal("fetch", (url: string, options?: RequestInit) => {
    appels.push({
      url: String(url),
      entetes: (options?.headers ?? {}) as Record<string, string>,
      corps: typeof options?.body === "string" ? options.body : "",
    });
    return Promise.resolve({
      ok: statut >= 200 && statut < 300,
      status: statut,
      json: () => Promise.resolve(reponse),
    } as Response);
  });
  return appels;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("la clé d'écran", () => {
  it("compose l'application et la section", () => {
    expect(cleEcran("back-office", "membres")).toBe("back-office.membres");
  });

  it("nomme explicitement l'accueil plutôt que de rendre une clé tronquée", () => {
    // Une clé finissant par un point ne correspondrait à aucune ancre, et le
    // tiroir s'ouvrirait vide sur la page la plus visitée.
    expect(cleEcran("portail", "")).toBe("portail.accueil");
  });

  it("normalise la casse et les séparations", () => {
    expect(cleEcran("Back-Office", "Suivi des Demandes")).toBe(
      "back-office.suivi-des-demandes",
    );
  });

  it("rend une clé vide quand l'application n'est pas nommée", () => {
    expect(cleEcran("", "membres")).toBe("");
  });

  it("retient le premier segment du fragment et ignore l'identifiant", () => {
    // Deux fiches d'un même écran parlent du même écran : les distinguer
    // demanderait une ancre par ligne de la base.
    expect(cleEcranDepuisFragment("direction", "#/membres/12")).toBe("direction.membres");
    expect(cleEcranDepuisFragment("direction", "#/membres")).toBe("direction.membres");
  });

  it("traite un fragment vide comme l'accueil", () => {
    expect(cleEcranDepuisFragment("site", "#/")).toBe("site.accueil");
  });
});

describe("le client d'aide", () => {
  const config = { api: "https://api.exemple.org/", application: "controleur" };

  it("borne chaque lecture à son application et à sa langue", async () => {
    const appels = poserReseau([]);
    await new ClientAide(config).articles();
    const url = new URL(appels[0]!.url);
    expect(url.pathname).toBe("/api/v1/aide/articles");
    expect(url.searchParams.get("application")).toBe("controleur");
    expect(url.searchParams.get("langue")).toBe("fr");
  });

  it("omet l'application pour le guichet central", async () => {
    const appels = poserReseau([]);
    await new ClientAide({ api: "https://api.exemple.org" }).articles();
    expect(new URL(appels[0]!.url).searchParams.has("application")).toBe(false);
  });

  it("ne présente un jeton que lorsqu'il en existe un", async () => {
    const appels = poserReseau([]);
    await new ClientAide({ ...config, jeton: () => "" }).articles();
    expect(appels[0]!.entetes.Authorization).toBeUndefined();

    await new ClientAide({ ...config, jeton: () => "jeton-de-session" }).articles();
    expect(appels[1]!.entetes.Authorization).toBe("Bearer jeton-de-session");
  });

  it("relit le jeton à chaque appel", async () => {
    // Le jeton change au renouvellement de session. Le capturer une fois ferait
    // échouer toutes les requêtes suivantes avec l'ancien.
    let courant = "premier";
    const appels = poserReseau([]);
    const client = new ClientAide({ ...config, jeton: () => courant });
    await client.articles();
    courant = "second";
    await client.articles();
    expect(appels[1]!.entetes.Authorization).toBe("Bearer second");
  });

  it("échappe la clé d'article dans l'adresse", async () => {
    const appels = poserReseau({});
    await new ClientAide(config).article("pointage/hors-ligne");
    expect(appels[0]!.url).toContain("pointage%2Fhors-ligne");
  });

  it("n'interroge pas le serveur sous deux caractères", async () => {
    const appels = poserReseau([]);
    expect(await new ClientAide(config).recherche(" a ")).toEqual([]);
    expect(appels).toHaveLength(0);
  });

  it("cherche avec le terme débarrassé de ses espaces", async () => {
    const appels = poserReseau([]);
    await new ClientAide(config).recherche("  cotisation  ");
    expect(new URL(appels[0]!.url).searchParams.get("q")).toBe("cotisation");
  });

  it("rend un refus lisible sans révéler si l'article existe", async () => {
    poserReseau({}, 404);
    await expect(new ClientAide(config).article("inconnue")).rejects.toBeInstanceOf(ErreurAide);
    await expect(new ClientAide(config).article("inconnue")).rejects.toThrow(
      /n'existe pas ou ne vous est pas accessible/,
    );
  });

  it("ne laisse jamais un échec de mesure remonter au lecteur", async () => {
    // Un compteur qui casse la page d'aide transforme une gêne en panne, sur
    // l'écran exact où la personne était déjà en difficulté.
    vi.stubGlobal("fetch", () => Promise.reject(new Error("réseau coupé")));
    await expect(
      new ClientAide(config).signaler({ type: "recherche", requete: "x", resultats: 0 }),
    ).resolves.toBeUndefined();
  });

  it("joint l'application à chaque signalement", async () => {
    const appels = poserReseau({});
    await new ClientAide(config).signaler({ type: "ouverture", cle_ecran: "controleur.scan" });
    const corps = JSON.parse(appels[0]!.corps) as Record<string, unknown>;
    expect(corps.application).toBe("controleur");
    expect(corps.cle_ecran).toBe("controleur.scan");
  });
});

describe("le rangement local", () => {
  const config = { api: "https://api.exemple.org", application: "controleur" };

  function rangement() {
    const contenu = new Map<string, unknown>();
    return {
      contenu,
      lire: (cle: string) => contenu.get(cle) ?? null,
      ecrire: (cle: string, valeur: unknown) => {
        contenu.set(cle, valeur);
      },
    };
  }

  it("garde ce que le réseau a rendu", async () => {
    poserReseau([{ cle: "a", titre: "Un article" }]);
    const local = rangement();
    await new ClientAide({ ...config, rangement: local }).articles();
    expect(local.contenu.size).toBe(1);
  });

  it("sert la version gardée quand le réseau est absent", async () => {
    // Le seul cas où le rangement répond, et celui pour lequel il existe : un
    // contrôleur devant une file, sans couverture.
    const local = rangement();
    poserReseau([{ cle: "a", titre: "Un article" }]);
    const client = new ClientAide({ ...config, rangement: local });
    await client.articles();

    vi.stubGlobal("fetch", () => Promise.reject(new Error("réseau coupé")));
    const horsLigne = await client.articles();
    expect(horsLigne).toEqual([{ cle: "a", titre: "Un article" }]);
  });

  it("ne sert rien hors ligne quand rien n a été gardé", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("réseau coupé")));
    await expect(
      new ClientAide({ ...config, rangement: rangement() }).articles(),
    ).rejects.toThrow(/hors connexion/);
  });

  it("ne sert JAMAIS la version gardée après un refus du serveur", async () => {
    // Un refus est une réponse, pas une panne. Servir une version gardée après un
    // 403 rendrait lisible un article dont la personne vient de perdre le droit.
    const local = rangement();
    poserReseau([{ cle: "secret", titre: "Réservé" }]);
    const client = new ClientAide({ ...config, rangement: local });
    await client.articles();

    poserReseau({}, 403);
    await expect(client.articles()).rejects.toBeInstanceOf(ErreurAide);
  });

  it("sert la lecture même si le rangement refuse d écrire", async () => {
    poserReseau([{ cle: "a" }]);
    const plein = {
      lire: () => null,
      ecrire: () => {
        throw new Error("quota dépassé");
      },
    };
    await expect(
      new ClientAide({ ...config, rangement: plein }).articles(),
    ).resolves.toEqual([{ cle: "a" }]);
  });

  it("distingue deux écrans dans le rangement", async () => {
    const local = rangement();
    poserReseau([]);
    const client = new ClientAide({ ...config, rangement: local });
    await client.parEcran("controleur.scan");
    await client.parEcran("controleur.queue");
    expect(local.contenu.size).toBe(2);
  });
});
