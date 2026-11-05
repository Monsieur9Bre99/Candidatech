# [¢]            CANDIDATECH   

</p>
  <p align="center">
  <img src="https://img.shields.io/badge/Version-0.1-355f9e?style=for-the-badge" alt="Version 0.1">
  <img src="https://img.shields.io/badge/HTML5-Structure-e34f26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-Styles-1572b6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-Natif-f7df1e?style=for-the-badge&logo=javascript&logoColor=222" alt="JavaScript natif">
  <img src="https://img.shields.io/badge/Supabase-Database-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase Database">
</p>

<p align="center">
  <em>Application web de suivi des candidatures, des relances et des entreprises ciblées.</em>
</p>

---


## Présentation

**Candidatech**  est un projet personnel développé pour simplifier le suivi des candidatures et la prospection d'entreprises.
L'objectif est de centraliser les informations relatives à la recherche d'emploi, d'alternance ou de stages. Il s'agit de mettre en place un système de suivi clair permettant de garder une trace du contexte de chaque candidature, d'organiser les étapes suivantes et de suivre l'évolution de ses démarches.

Le projet s'inspire d'un classeur « Tableau suivi candidatures & Benchmark » utilisé pour organiser les démarches de recherche. : il reprend  les informations essentielles de ce support et les rassemble dans une application web accessible directement depuis le navigateur.

L'application privilégie une utilisation locale et propose une connexion à une base des données pour les fonctionnalités liées à l'espace personnel et à la synchronisation des données.

## Démonstration

**Application :** [Accéder à Candidatech](https://monsieur9bre99.github.io/Candidatech/)

## Fonctionnalités

### Gestion des candidatures

- Enregistrement des entreprises, postes et dates de candidature.
- Suivi des statuts et des types de contrat.
- Conservation des contacts, notes et liens vers les offres.
- Définition d'une prochaine action et de son échéance.
- Consultation, modification et suppression des candidatures.

### Gestion des entreprises

- Centralisation des entreprises ciblées.
- Conservation des coordonnées et informations utiles.
- Suivi des démarches de prospection.
- Association des entreprises aux candidatures.

### Tableau de bord

- Vue d'ensemble des candidatures.
- Identification des relances à effectuer.
- Suivi des prochaines échéances.
- Accès rapide aux informations importantes.

### Sauvegarde et données

- Export des données au format JSON.
- Export des candidatures au format CSV.
- Import d'une sauvegarde existante.
- Stockage local dans le navigateur.
- Connexion Supabase facultative et migration des données locales à la demande.

## Technologies

| Domaine | Technologies |
|---|---|
| Structure | HTML5 |
| Présentation | CSS3 |
| Logique applicative | JavaScript natif (modules ES) |
| Base de données et authentification | Supabase |
| Hébergement | GitHub Pages |
| Intégration et déploiement continus | GitHub Actions |

Le projet utilise des modules JavaScript natifs. Aucun bundler ni outil de compilation n'est nécessaire pour son exécution.

## Architecture

Le code JavaScript est organisé par responsabilité afin de séparer le point d'entrée, l'orchestration applicative, les composants d'interface, les services et les fonctions utilitaires.

```text
js/
├── main.js
├── landing.js
├── application.js
├── components/
│   ├── theme-toggle.js
│   └── toast.js
├── config/
│   └── supabase-config.js
├── services/
│   ├── application-store.js
│   ├── backup-service.js
│   ├── local-data-service.js
│   ├── record-mappers.js
│   ├── supabase-auth-service.js
│   ├── supabase-data-service.js
│   └── theme-service.js
├── utils/
│   ├── date.js
│   ├── dom.js
│   ├── html.js
│   └── id.js
└── views/
    ├── dashboard-view.js
    ├── record-list-view.js
    └── record-view.js
```

- `main.js` : point d'entrée de l'application.
- `landing.js` : initialisation de la landing page.
- `application.js` : orchestration de l'interface et des interactions.
- `components/` : éléments d'interface réutilisables.
- `config/` : configuration des services externes.
- `services/` : gestion de l'état, persistance, authentification, synchronisation et sauvegardes.
- `utils/` : fonctions utilitaires partagées.
- `views/` : rendu des différentes vues de l'application.

## Installation et lancement

### Prérequis

- Git
- Un navigateur web récent
- Visual Studio Code ou un éditeur équivalent
- Live Server ou un serveur HTTP local

### Récupération du projet

```bash
git clone https://github.com/Monsieur9Bre99/Candidatech.git
cd Candidatech
```

Ouvrir ensuite le dossier dans l'éditeur et lancer `index.html` avec un serveur local, par exemple Live Server.

L'utilisation d'un serveur HTTP local est nécessaire pour le chargement des modules JavaScript. L'ouverture directe des fichiers avec le protocole `file://` peut entraîner des erreurs CORS.

### Configuration Supabase

La configuration du projet Supabase se trouve dans :

```text
js/config/supabase-config.js
```

Pour utiliser les fonctionnalités distantes, renseigner les paramètres du projet conformément à la structure attendue par ce fichier.

Ne jamais exposer de clé `service_role` ou de secret dans le code côté navigateur. Seule une clé publique destinée à cet usage peut être intégrée au client, avec les politiques RLS correctement configurées.

L'utilisation locale de l'application ne nécessite pas obligatoirement de compte Supabase.

## Déploiement

Le projet est hébergé sur GitHub Pages.

Le déploiement est automatisé avec GitHub Actions lors d'un push sur la branche `main`. Une exécution manuelle du workflow est également possible depuis l'onglet Actions du dépôt.

Le workflow vérifie les fichiers nécessaires et la syntaxe JavaScript avant de publier le site.

## État du projet

Candidatech est un projet personnel en cours d'évolution.

Les évolutions portent principalement sur la maintenance du code, la séparation des responsabilités, la fiabilité de la persistance des données et l'amélioration progressive de l'interface.

## Licence

Consulter le fichier `LICENSE` à la racine du dépôt pour connaître les conditions d'utilisation et de distribution du projet.

---

<p align="center">
  <sub>&copy; 2026 - <strong> Candidatech </strong>, outil personnel pour structurer et suivre ses démarches professionnelles.</sub>
</p>
