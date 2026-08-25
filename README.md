# ui-web

Part of the ADSUM platform (membership, QR check-in and attendance).
Subgroup: `packages`.

## Role

@adsum/ui-web: web components from the Design System.


## État au 25 août 2026 : le seuil est franchi

Ce paquet est resté vide jusqu'ici, et c'était délibéré. La règle écrite ici disait
d'attendre qu'un même composant non trivial, avec ses états de chargement, d'erreur
et de vide, existe à l'identique dans trois applications. Deux copies se tolèrent,
trois annoncent une quatrième.

Le centre d'aide franchit ce seuil : il est attendu dans les dix surfaces. Le paquet
porte donc, depuis la version 0.1.0, la coquille de l'aide et rien d'autre.

**Ce qu'il contient.** `ClientAide` (le seul appelant de l'API d'aide), `TiroirAide`
(l'aide contextuelle d'un écran), `BoutonAide`, `PageAide` (le centre en page pleine,
qui sert aussi bien le guichet central qu'une application) et `RenduBlocs` (le rendu
des blocs typés). Plus `cleEcran`, qui compose la clé d'écran à partir des registres
de navigation existants plutôt que d'une saisie à la main.

**Ce qu'il ne contient pas, et ne contiendra jamais : une phrase d'aide.** Une
coquille partagée se met à jour par montée de version puis réinstallation dans chaque
application. Un texte posé ici coûterait dix redéploiements pour corriger une faute
de frappe. Tout ce qui varie, le contenu, les ancrages, l'ordre, les libellés et la
langue, vient du serveur.

**Les couleurs viennent de `@adsum/tokens`**, sans exception, avec un repli sur
chaque variable. C'est ce qui fait que l'aide ressemble à l'application qui
l'héberge, dans les dix cas, et qu'elle suit le thème sombre sans une ligne de plus.

## Stack

TypeScript, React, Tailwind, shadcn/ui.

## Conventions

- Branches: work on `feature/*` or `fix/*` from `develop`, then a merge request.
  Merge order `feature/* -> develop -> main`. Never push to `main`.
- Constitution (zero tolerance): no mock data, no file over 500 lines,
  no em-dash (U+2014 / U+2013), no secret in clear. CI enforces these.
- Commit messages in English, Conventional Commits.

## CI

Pipelines are defined in `.gitlab-ci.yml`, which includes the shared templates
from `sr-media-ai/adsum/deployment/ci-templates`.
