import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Venti — Descubre eventos que te apasionan",
  description:
    "Plataforma de descubrimiento de eventos impulsada por IA. Encuentra los mejores eventos personalizados según tus intereses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
