import type { ReactNode } from 'react';

export function GajanLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-bold">
              GT
            </div>
            <span className="text-lg font-semibold">Gajan Traders</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Gajan Traders
        </footer>
      </body>
    </html>
  );
}
