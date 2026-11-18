import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pairloop — one list for the two of you",
  description: "Shared tasks, urgent reminders and wishlists for partners. Type or say a task and it's sorted.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Pairloop", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1122" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" toastOptions={{ style: { borderRadius: 16, fontFamily: "var(--font-sans)" } }} />
      </body>
    </html>
  );
}
