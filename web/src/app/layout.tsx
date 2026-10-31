import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenomicsAI — Bioinformatics Analysis Platform",
  description: "Advanced bioinformatics platform for DNA pattern analysis, pairwise global alignment, mutation detection, disease association, and pharmacogenomics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased font-sans min-h-screen">
        <AuthProvider>
          <AppLayoutWrapper>
            {children}
          </AppLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
