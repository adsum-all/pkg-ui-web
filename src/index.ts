/**
 * @adsum/ui-web : la coquille partagée du centre d'aide.
 *
 * Le paquet ne contient que du comportement et de la mise en forme. Aucune phrase
 * d'aide n'y figure : elles viennent toutes du serveur, faute de quoi corriger une
 * faute de frappe coûterait une montée de version et dix redéploiements.
 */
export { ClientAide, ErreurAide } from "./aide/clientAide";
export type {
  Article,
  ArticleResume,
  Bloc,
  ConfigurationAide,
  RangementAide,
  Rubrique,
  TypeUsage,
  Usage,
} from "./aide/clientAide";
export { BoutonAide } from "./aide/BoutonAide";
export { PageAide } from "./aide/PageAide";
export { RenduBlocs } from "./aide/RenduBlocs";
export { TiroirAide } from "./aide/TiroirAide";
export { cleEcran, cleEcranDepuisFragment } from "./aide/registreAide";
