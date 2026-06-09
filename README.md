# SIS ENSET

Système d’Information et de Services numériques pour l’ENSET de Douala.

## Fonctionnalités

* Authentification et gestion des rôles
* Gestion des utilisateurs
* Gestion documentaire
* Archivage des mémoires
* Génération d'articles académiques inspirés IEEE
* Validation semi-automatique
* Messagerie interne
* Notifications
* Sessions réseau (mode simulation et intégration MikroTik prévue)
* Recherche documentaire

## Technologies

### Backend

* Django REST Framework
* PostgreSQL
* JWT Authentication

### Frontend

* React
* Vite
* Tailwind CSS

## Lancement

### Backend

```bash
cd backend
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Auteur

Steve Mbosop
ENSET Douala
