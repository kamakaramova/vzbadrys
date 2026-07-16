import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  metadataBase: new URL("https://xn--80abckmj9cj3h.xn--p1ai"),
  title: "Взбадрись — магазин БАДов и суперфудов",
  description: "Качественные БАДы и суперфуды с документами. Магний, цинк, селен и семена для здоровья. Доставка по России.",
  keywords: "БАДы, магний, цинк, селен, семена, нутрициолог, витамины, здоровье",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Взбадрись — магазин БАДов и суперфудов",
    description: "Качественные БАДы и суперфуды с документами. Доставка по России.",
    url: "https://xn--80abckmj9cj3h.xn--p1ai",
    siteName: "Взбадрись",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
