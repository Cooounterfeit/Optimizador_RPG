import { Outlet } from 'react-router-dom';

import { Footer } from '../features/catalog/components/Footer';
import { TopBar } from '../features/catalog/components/TopBar';
import { copy } from '../features/catalog/copy';

export function AppLayout() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <a
        href="#catalog"
        className="absolute left-4 top-[-60px] z-[300] rounded-[2px] bg-primary px-3 py-2 font-bold text-primary-foreground transition-[top] duration-150 focus-visible:top-3"
      >
        {copy.skipToCatalog}
      </a>
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
