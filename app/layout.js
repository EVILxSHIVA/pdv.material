import { Outfit, Figtree } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PDV Material Management | Mobile ERP",
  description: "Mobile-first operational material management, inventory control, and procurement workspace",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

import { AuthProvider } from "@/lib/auth/AuthContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${figtree.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}