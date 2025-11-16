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
        {/* NAVBAR */}
        <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
          <div className="container-fluid">
            {/* LOGO À GAUCHE */}
            <a className="navbar-brand d-flex align-items-center" href="/">
              <img
                src="/flipp-logo.png"
                alt="Flipp Logo"
                width="120"
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
                  <a className="nav-link fw-semibold" href="/compare">
                    Circulaires
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-semibold" href="/produits">
                    Coupons
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-semibold" href="/statistiques">
                    Liste d'achats
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-semibold" href="/statistiques">
                    Recherche
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link fw-semibold" href="/statistiques">
                    Comparateur
                  </a>
                </li>
              </ul>

              {/* MENU DROITE — LANGUE + CONNEXION */}
              <div className="d-flex align-items-center gap-3">
                {/* Sélecteur de langue */}
                <select className="form-select form-select-sm" style={{ width: "90px" }}>
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>

                {/* Connexion */}
                <a href="javascript;" className="btn btn-outline-primary btn-sm">
                  Connexion
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <main className="min-vh-100 bg-light">{children}</main>

        {/* FOOTER COMPLET */}
        <footer className="bg-dark text-white py-5">
          <div className="container">
            {/* Ligne de séparation et copyright */}
            <hr className="border-white-50 my-4" />
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