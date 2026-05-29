import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: "FinanceHub - Smart Banking Solutions",
  description: "Professional finance and banking management platform with secure transactions, budgeting tools, and real-time analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${poppins.className} antialiased relative`}
      >
        <ErrorBoundary>
          <AuthProvider>
            {children}
            <Toaster 
              richColors
              position="bottom-right"
              theme="system"
              toastOptions={{
                className: 'font-[var(--font-poppins)]',
                duration: 4000,
                style: {
                  background: 'var(--bg-color)',
                  color: 'var(--text-1)',
                  border: '1px solid var(--border-1)',
                },
              }}
            />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
