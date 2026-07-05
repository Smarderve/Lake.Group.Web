import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Lake Group — Powering Tanzania Forward",
  description:
    "Reliable Energy. Trusted Innovation. Lake Group — premium petroleum solutions for Tanzania.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Lake Group — Powering Tanzania Forward",
    description: "Reliable Energy. Trusted Innovation.",
    images: [{ url: "/lake-group-logo.png", width: 410, height: 123 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lake Group — Powering Tanzania Forward",
    description: "Reliable Energy. Trusted Innovation.",
    images: ["/lake-group-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#020611",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#020611] text-white">{children}</body>
    </html>
  );
}
