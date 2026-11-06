import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../../../components/ui/Button';
import { SearchInput } from '../../../components/ui/SearchInput';
import { useAuth } from '../../auth/AuthProvider';
import { copy } from '../copy';
import { monogram } from '../monogram';

export function TopBar() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, user, signOut } = useAuth();
  const query = params.get('q') ?? '';

  const updateQuery = (value: string) => {
    const next = new URLSearchParams(params);

    if (value) next.set('q', value);
    else next.delete('q');

    if (location.pathname === '/') {
      setParams(next, { replace: true });
      return;
    }

    navigate({ pathname: '/', search: next.toString() });
  };

  const leave = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-[100] flex h-16 items-center gap-6 border-b border-line bg-[oklch(0.15_0.003_260/0.94)] px-6 backdrop-blur-[10px] max-[720px]:gap-3 max-[720px]:px-3">
      <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Zenith Optimizer home">
        <span
          aria-hidden="true"
          className="grid h-[27px] w-[27px] place-items-center bg-primary font-mono text-[15px] font-semibold leading-none text-primary-foreground [clip-path:polygon(0_0,100%_0,100%_60%,60%_100%,0_100%)]"
        >
          Z
        </span>
        <span className="flex flex-col gap-0.5 max-[720px]:hidden">
          <span className="text-[13px] font-extrabold leading-none tracking-[0.19em]">
            {copy.brand.toUpperCase()}
          </span>
          <span className="font-mono text-[8.5px] leading-none tracking-[0.22em] text-muted-foreground">
            {copy.brandSub.toUpperCase()}
          </span>
        </span>
      </Link>

      <SearchInput
        label={copy.searchLabel}
        placeholder={copy.searchPlaceholder}
        value={query}
        onChange={(event) => updateQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') updateQuery('');
        }}
      />

      <div className="flex shrink-0 items-center gap-2">
        <Link to="/login">
          <Button className="max-[720px]:px-[11px]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="square"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="max-[720px]:hidden">{copy.newOptimizer}</span>
          </Button>
        </Link>

        {status === 'authenticated' && user ? (
          <details className="relative [&::-webkit-details-marker]:hidden">
            <summary
              className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-line py-[3px] pl-[3px] pr-[10px] transition-colors hover:border-line-strong hover:bg-surface [&::-webkit-details-marker]:hidden"
              aria-label={copy.account}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-[34px] w-[34px] rounded-full border border-line-strong object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid h-[34px] w-[34px] place-items-center rounded-full border border-line-strong bg-muted font-mono text-[12px] font-semibold uppercase"
                >
                  {monogram(user.displayName)}
                </span>
              )}
              <span className="max-w-[14ch] truncate text-[12px] text-muted-foreground max-[720px]:hidden">
                {user.displayName}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                aria-hidden="true"
                className="text-muted-foreground max-[720px]:hidden"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>

            <div className="absolute right-0 top-[calc(100%+8px)] w-[176px] rounded-[3px] border border-line bg-[oklch(0.19_0.004_260)] p-1 shadow-[0_16px_40px_oklch(0_0_0/0.45)]">
              <Link
                to="/perfil"
                className="block rounded-[2px] px-3 py-2 text-[12.5px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                {copy.profile.title}
              </Link>
              <button
                type="button"
                onClick={leave}
                className="block w-full rounded-[2px] px-3 py-2 text-left text-[12.5px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                {copy.profile.signOut}
              </button>
            </div>
          </details>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-line py-[3px] pl-[3px] pr-[13px] transition-colors hover:border-line-strong hover:bg-surface"
          >
            <span
              aria-hidden="true"
              className="inline-grid h-[34px] w-[34px] place-items-center rounded-full border border-line-strong bg-muted font-mono text-[12px] font-semibold uppercase text-foreground"
            >
              ?
            </span>
            <span className="text-[12px] text-muted-foreground max-[720px]:hidden">
              {copy.signIn}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
