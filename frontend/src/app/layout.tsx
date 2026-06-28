import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  display:  "swap",
});

export const metadata: Metadata = {
  title: {
    default:  "ZoomClone | Video Conferencing",
    template: "%s | ZoomClone",
  },
  description:
    "Free, reliable video meetings. Start or join a meeting in seconds with ZoomClone.",
  keywords: ["video calls", "meetings", "conferencing", "zoom clone", "video chat"],
  authors:  [{ name: "ZoomClone" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-white text-gray-900 min-h-screen`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>

        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 4000,
            style: {
              background:   "#ffffff",
              color:        "#1A1A1A",
              border:       "1px solid #E5E5E5",
              borderRadius: "12px",
              fontSize:     "14px",
              fontFamily:   "var(--font-inter)",
              boxShadow:    "0 8px 24px rgba(0,0,0,0.12)",
              padding:      "12px 16px",
            },
            success: {
              iconTheme: { primary: "#27AE60", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#EB5757", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
