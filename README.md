# Chokepoint Watch

Projet pédagogique de veille sur les passages maritimes, les corridors et les coûts logistiques.

## Consulter le projet

Le fichier `index.html` contient l’application autonome (HTML, CSS et JavaScript). Il peut être téléchargé et ouvert dans un navigateur. La publication GitHub Pages est configurée séparément dans les paramètres du dépôt.

## Historique pour l’évaluation

- [Toutes les modifications et leurs dates](https://github.com/bnikbds/chokepoint-watch/commits/main/)
- [Historique du fichier HTML](https://github.com/bnikbds/chokepoint-watch/commits/main/index.html)

Chaque mise à jour du HTML doit faire l’objet d’un nouveau commit explicite. Les versions antérieures restent consultables dans l’historique Git. L’historique commence lors de cet import ; il ne reconstitue pas les travaux antérieurs.

## Version importée le 29 octobre 2026

Source : `Chokepoint_Watch_P0_pour_Sites.html`. Fonctionnalités conservées : carte des neuf passages, quatre corridors, trafic PortWatch, budget fret, scénario de détour, briefing et exports.

Les données PortWatch sont chargées depuis le service public lorsque le navigateur l’autorise. Les saisies et le cache sont locaux au navigateur ; ils ne sont pas partagés entre visiteurs. Les bulletins et tarifs embarqués conservent leurs dates et limites de validité. Aucune actualisation ne s’exécute lorsque la page est fermée.

Prototype étudiant indépendant : ni outil de navigation, ni devis engageant.

## Surveillance autonome — 29 octobre 2026

GitHub Actions exécute `tools/collect.py` à 05:23 et 17:23 UTC, ou via « Run workflow » dans Actions. Aucun secret ni API payante. Le fichier `data/monitor.json` est versionné ; le site le relit automatiquement toutes les 15 minutes et à l'ouverture. Il lit le fichier public GitHub directement, avec secours local, car un commit fait par GITHUB_TOKEN ne déclenche pas nécessairement la reconstruction Pages. Les anciens relevés restent datés ; les scores expirent selon leur source.

Six séries PortWatch sont identifiées par leur nom officiel : Suez, Panama, Bab el-Mandeb, Malacca, Gibraltar, Dover. Singapour, Aden et Sicile ne sont pas substitués par des passages voisins. Prévisions de vent Open-Meteo au point représentatif pour les neuf zones, attribution CC BY 4.0. Ce point ne représente pas tout un corridor.

Score expérimental de vigilance opérationnelle : maximum des composantes disponibles. Trafic = baisse positive de la moyenne 28 jours par rapport à la médiane des 337 jours précédents × 100 ; minimum 300 jours de référence, deux fenêtres calendaires complètes pour la variation ; expiration après 14 jours. Vent = (maximum prévu en nœuds − 15) × 100/35, borné 0–100 ; expiration au terme de la prévision ou après 24 h. Couverture 0/2, 1/2 ou 2/2 affichée. Les seuils sont des choix pédagogiques non calibrés, pas une probabilité, ni un score militaire, ni un avis de navigation. La sûreté est explicitement non évaluée automatiquement ; bulletins et prix du site restent datés.

Vérifications : `python -m unittest discover -s tools -p 'test_*.py'`. Le collecteur refuse doublons, valeurs manquantes, dates futures, négatifs et conteneurs supérieurs au total. Il conserve les séries antérieures en cas de panne, sans changer leur date de collecte. L'interface invalide les scores trop anciens même si le collecteur est arrêté.

Sources : https://portwatch.imf.org/pages/data-and-methodology ; https://open-meteo.com/en/docs ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule . Les tâches GitHub peuvent être retardées ou désactivées après une longue inactivité du dépôt public. Vérifier Actions si la dernière collecte dépasse 24 h.

## Atlas géographique interactif

Leaflet 1.9.4 est embarqué dans `vendor/` avec sa licence. Le fond OpenStreetMap charge uniquement les tuiles visibles, avec attribution et cache navigateur. Aucun suivi AIS individuel ni itinéraire commercial réel n'est affiché. Le zoom, les neuf passages au clavier, les corridors indicatifs, le détour par le Cap, la fiche contextuelle, le mode agrandi et la suspension des animations sont disponibles. `prefers-reduced-motion` est respecté. Le fond nécessite Internet ; l'ancien contenu reste disponible si Leaflet ne charge pas.

Trois couches : vigilance opérationnelle expérimentale (trafic/vent), sûreté documentaire (niveaux attribués encore récents uniquement) et trafic moyen. Gris = inconnu/ancien ; bordure pointillée et astérisque = couverture partielle. Une sûreté non évaluée ne devient pas verte. Les tableaux et exports existants restent dans le volet de détails.
