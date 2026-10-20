import "./globals.css";
import { company } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const name = company.name;
  return {
    title: { default: name, template: `%s · ${name}` },
    description: "Book guided tours and holiday packages online, pay with mobile money or card.",
  };
}

export default function RootLayout({ children }) {
  const brand = company.brandColor;
  return (
    <html lang="en">
      <body style={brand ? { "--brand": brand, "--brand-dark": `color-mix(in srgb, ${brand} 78%, black)`, "--brand-soft": `color-mix(in srgb, ${brand} 18%, white)` } : undefined}>{children}</body>
    </html>
  );
}
