import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Opti-Core — Lead Intelligence',
  description: 'AI-assisted business intelligence for Optiscale Advisors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="font-bold text-lg tracking-tight">Opti-Core</span>
            <span className="ml-2 text-slate-400 text-sm">Lead Intelligence</span>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-slate-300 hover:text-white transition-colors">
              Leads
            </a>
            <a href="/upload" className="text-slate-300 hover:text-white transition-colors">
              Upload CSV
            </a>
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
