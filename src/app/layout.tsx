import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/auth-context";
import { ConditionalNavbar } from "@/components/ConditionalNavbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zee-Nzeru Online Tutoring Platform",
  description: "Connect with verified expert tutors in Malawi for live one-on-one sessions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <div className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
            {/* Only shows on /, /about, /contact — hidden on /student, /tutor, /admin, /auth */}
            <ConditionalNavbar />
            {children}
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}