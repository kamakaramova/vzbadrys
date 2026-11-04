import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import AuthBootstrap from "@/components/AuthBootstrap";
import YandexMetrika from "@/components/YandexMetrika";
import { SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "взБАДрись — магазин БАДов",
  description: "Качественные БАДы с документами. Магний, цинк и селен. Доставка по России.",
  keywords: "БАДы, магний, цинк, селен, нутрициолог, витамины, здоровье",
  alternates: { canonical: "/" },
  verification: { yandex: "e43c58cf211d68d1" },
  openGraph: {
    title: "взБАДрись — магазин БАДов",
    description: "Качественные БАДы с документами. Доставка по России.",
    url: "https://xn--80abckmj9cj3h.xn--p1ai",
    siteName: "взБАДрись",
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
        <AuthBootstrap />
        <YandexMetrika />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
