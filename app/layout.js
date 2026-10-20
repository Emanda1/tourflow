import "./globals.css";
import { company } from "@/lib/config";

export const metadata = {
  title: { default: company.name, template: `%s · ${company.name}` },
  description: "Book guided tours and holiday packages online, pay with mobile money or card.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
