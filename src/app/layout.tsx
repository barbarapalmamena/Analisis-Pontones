import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salmonera Puerto Montt - Dashboard de Monitoreo",
  description: "Sistema de soporte a la decisión para pontones y operaciones de cultivo de salmón.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
