import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Tracker",
  description: "Personal health, workout, and nutrition tracker.",
  verification: {
    google: "qivZs1TP9DLeIA8beUvy-so-ozP_wwgiE629dLtnyrI",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Health Tracker",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

// device-width, no pinch-zoom, and viewportFit "cover" so safe-area-inset-*
// (notch / home indicator) is actually available to CSS on iPhone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#007aff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
