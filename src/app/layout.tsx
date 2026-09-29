import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BASE_PATH } from '@/lib/base-path';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Controle de Presença — Trilho do Vencedor',
  description:
    'Gestão de alunos, cursos, calendário de aulas e controle de presença — Trilho do Vencedor.',
  // O Next NÃO prefixa sozinho os caminhos de manifest/icons do
  // metadata com o basePath (diferente de <Link>/<Image>) — por isso
  // o BASE_PATH na mão aqui (ver src/lib/base-path.ts).
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Trilho do Vencedor',
  },
  icons: {
    icon: [
      { url: `${BASE_PATH}/icon-32.png`, sizes: '32x32', type: 'image/png' },
      { url: `${BASE_PATH}/icon-192.png`, sizes: '192x192', type: 'image/png' },
    ],
    apple: `${BASE_PATH}/icon-180.png`,
  },
};

export const viewport: Viewport = {
  themeColor: '#3261af',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
