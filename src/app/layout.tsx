// app/layout.tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";
import BootstrapClient from "@/app/components/BootstrapClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flipp - Économisez sur vos courses",
  description: "Assistant IA intelligent pour comparer les prix et optimiser vos courses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} antialiased`}>
        {/* NAVBAR COMPACTE */}
        <nav className="navbar navbar-expand-lg navbar-light bg-white">
          <div className="container-fluid">
            {/* LOGO À GAUCHE */}
            <a className="navbar-brand d-flex align-items-center" href="/">
              <img
                src="/flipp-logo.png"
                alt="Flipp Logo"
                width="100"
                height="auto"
                className="me-2"
              />
            </a>

            {/* BOUTON MOBILE */}
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#mainNavbar"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            {/* CONTENU MENU */}
            <div className="collapse navbar-collapse" id="mainNavbar">
              {/* MENU PRINCIPAL */}
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                <li className="nav-item">
                  <a className="nav-link fw-semibold" href="/compare" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    Circulaires
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-semibold" href="/produits" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    Coupons
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-semibold" href="/statistiques" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    Liste d'achats
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-semibold" href="/statistiques" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    Recherche
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-semibold" href="/statistiques" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    Comparateur
                  </a>
                </li>
              </ul>

              {/* MENU DROITE — LANGUE + CONNEXION */}
              <div className="d-flex align-items-center gap-2">
                {/* Sélecteur de langue */}
                <select className="form-select form-select-sm" style={{ width: "80px", fontSize: '0.8rem' }}>
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>

                {/* Connexion */}
                <a href="javascript;" className="btn btn-outline-primary btn-sm" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
                  Connexion
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <main>{children}</main>

        {/* FOOTER COMPLET */}
        <footer className="bg-dark text-white py-4">
          <div className="container">
            {/* Ligne de séparation et copyright */}
            <hr className="border-white-50 my-3" />
            <div className="text-center text-white-50 small">
              © {new Date().getFullYear()} Flipp — Tous droits réservés
            </div>
          </div>
        </footer>

        <BootstrapClient />
      </body>
    </html>
  );
}