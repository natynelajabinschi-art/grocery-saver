import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-800`}
      >
        <div className="min-h-screen flex flex-col items-center justify-start py-8 px-4 md:px-6 lg:px-8">
          <header className="w-full max-w-6xl mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <span className="text-2xl text-white">🛒</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                SmartShopper
              </h1>
            </div>
            <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
              Comparez vos produits entre <strong className="text-indigo-600">IGA</strong> et{" "}
              <strong className="text-purple-600">Metro</strong> — trouvez les meilleurs prix en temps réel
            </p>
          </header>

          <main className="w-full max-w-6xl flex-1 flex flex-col">
            {children}
          </main>

          <footer className="w-full max-w-6xl mt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} SmartShopper — Comparateur IA de prix
          </footer>
        </div>
      </body>
    </html>
  );
}