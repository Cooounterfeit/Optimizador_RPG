import { Link } from 'react-router-dom';

import { buttonVariants } from '../components/ui/Button';
import { copy } from '../features/catalog/copy';

interface SimplePageProps {
  title: string;
  note: string;
}

/** Pantalla minima para las rutas que todavia no tienen su feature. */
export function SimplePage({ title, note }: SimplePageProps) {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-24">
      <h1 className="mb-3 text-2xl font-extrabold tracking-[-0.03em]">{title}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{note}</p>
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>
        {copy.pages.back}
      </Link>
    </div>
  );
}
