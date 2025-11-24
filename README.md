# Grocery Saver

Une application intelligente pour économiser sur vos courses en comparant les prix des circulaires d'épicerie et en trouvant les meilleures aubaines.

## Fonctionnalités

- **Import automatique de circulaires** - Récupère quotidiennement les promotions de Walmart, Metro et Super C
- **Recherche de promotions** - Trouve les meilleures aubaines par magasin et catégorie
- **Statistiques en temps réel** - Visualise le nombre de promotions actives par magasin
- **Base de données Supabase** - Stockage fiable et performant des promotions
- **API REST** - Endpoints pour importer et consulter les promotions
- **Interface moderne** - Design responsive avec Tailwind CSS et Bootstrap

## Technologies

- **Frontend**: Next.js 15.5.4 avec React 19
- **Styling**: Tailwind CSS 4 + Bootstrap 5
- **Animations**: Framer Motion
- **Base de données**: Supabase
- **IA**: OpenAI API
- **Web Scraping**: Cheerio + Axios
- **Testing**: Playwright
- **Langage**: TypeScript

## Prérequis

- Node.js 20+
- npm, yarn, pnpm ou bun
- Compte Supabase
- Clé API OpenAI

## 🔧 Installation

1. **Cloner le projet**
```bash
git clone https://github.com/natynelajabinschi-art/grocery-saver.git
cd grocery-saver
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env.local` à la racine du projet :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_supabase

# OpenAI
OPENAI_API_KEY=votre_cle_openai
```

4. **Lancer le serveur de développement**
```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📦 Scripts disponibles

```bash
# Développement avec Turbopack
npm run dev

# Build de production
npm run build

# Démarrer en production
npm run start
```

### Mise en place

1. Créez un projet sur [Supabase](https://supabase.com)
2. Créez la table `promotions` avec les colonnes ci-dessus
3. Ajoutez vos clés dans `.env.local`

## Structure du projet

```
grocery-saver/
├── app/
│   ├── api/                    # GET/POST endpoints
│   │        
│   └── page.tsx               # Page principale
├── components/                # Composants React réutilisables
├── lib/
│   ├── flyers.ts             # Récupération promotions Flipp
│   ├── storePromotions.ts    # Gestion base de données
│   └── supabaseClient.ts     # Configuration Supabase
├── public/                    # Assets statiques
└── styles/                    # Fichiers CSS globaux
```

## API Endpoints

### `GET /api/flyers`
Importe les circulaires du jour pour tous les magasins configurés.

**Réponse:**
```json
{
  "success": true,
  "summary": {
    "totalStores": 3,
    "totalFound": 450,
    "totalInserted": 380,
    "duration": "12.45"
  },
  "results": [...],
  "currentDatabase": {
    "Walmart": 125,
    "Metro": 138,
    "Super C": 117
  }
}
```

### `POST /api/import-flyers`
Force un nouvel import en vidant d'abord la base de données.

**Body:**
```json
{
  "force": true
}
```

## Configuration

Les magasins et le code postal sont configurables dans `/app/api/import-flyers/route.ts` :

```typescript
const CONFIG = {
  stores: ["Walmart", "Metro", "Super C"],
  postalCode: "H2S0B8",
  maxPromoPerCategory: 100,
  minResultsThreshold: 3
};
```

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amelioration`)
3. Commit vos changements (`git commit -m 'Ajout d'une fonctionnalité'`)
4. Push vers la branche (`git push origin feature/amelioration`)
5. Ouvrir une Pull Request


** Astuce** : Ajoutez vos épiceries favorites et laissez Grocery Saver trouver les meilleures aubaines pour vous !