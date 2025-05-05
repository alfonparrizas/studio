import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Use Inter font for a cleaner look
import './globals.css';
import { Toaster } from "@/components/ui/toaster" // Import Toaster

const inter = Inter({ subsets: ['latin'] }) // Changed font

export const metadata: Metadata = {
  title: 'Foncorp Chat UI', // Updated title
  description: 'Chat with Foncorp AI Agents', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">{/* Added dark class */}
      <body className={`${inter.className} antialiased`}> {/* Use Inter class */}
        {children}
        <Toaster /> {/* Add Toaster component */}
      </body>
    </html>
  );
}
