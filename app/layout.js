import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Loop Smith Management",
  description: "Next.js Application for Loop Smith Management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.className}>
      <body className="bg-gray-50 text-gray-900 font-sans h-screen overflow-hidden flex">
        {children}
      </body>
    </html>
  );
}
