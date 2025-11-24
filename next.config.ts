/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack est supporté par Vercel
  experimental: {
    turbo: {
      // Configuration optionnelle
    }
  },
  
  // Images externes (si vous utilisez des images de Flipp)
  images: {
    domains: [
      'flipp.com',
      'images.flipp.com',
      // Ajoutez d'autres domaines si nécessaire
    ],
  },
  
  // Variables d'environnement publiques
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
};

module.exports = nextConfig;