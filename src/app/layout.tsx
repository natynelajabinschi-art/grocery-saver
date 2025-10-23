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
  title: "SmartShopper - Comparateur de prix IGA vs Metro",
  description:
    "Assistant IA intelligent pour comparer les prix entre IGA et Metro et optimiser vos courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} antialiased`}>
        {/* Navbar */}
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
          <div className="container-fluid">
            <a className="navbar-brand d-flex align-items-center" href="/">
              <span className="fw-bold">Travail d'équipe</span>
            </a>
          </div>
        </nav>

        {/* Main Content */}
        <main className="min-vh-100 bg-light">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-dark text-white py-4 mt-5">
          <div className="container">
            <hr className="border-white-50 my-4" />
            <div className="text-center text-white-50">
              <small>
                © {new Date().getFullYear()} SmartShopper — Tous droits réservés
              </small>
            </div>
          </div>
        </footer>

        <BootstrapClient />
      </body>
    </html>
  );
}