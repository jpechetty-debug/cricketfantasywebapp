import {
  ClipboardList,
  CloudDownload,
  LayoutDashboard,
  LogOut,
  PenLine,
  Shield,
  Swords,
  Trophy,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LogoutDialog from './LogoutDialog';
import { Avatar, Logo } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const userLinks: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/matches', label: 'Matches', icon: Swords },
  { to: '/my-teams', label: 'My Teams', icon: Shield },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
];

const adminLinks: NavItem[] = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/matches', label: 'Matches', icon: Swords },
  { to: '/admin/players', label: 'Players', icon: Users },
  { to: '/admin/scoring', label: 'Scoring', icon: PenLine },
  { to: '/admin/cricheroes', label: 'Import', icon: CloudDownload },
  { to: '/admin/users', label: 'Members', icon: UserCog },
];

export default function AppLayout() {
  const { auth, isAdmin } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { pathname } = useLocation();
  const links = isAdmin ? adminLinks : userLinks;
  const home = isAdmin ? '/admin/dashboard' : '/dashboard';

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-lime focus:px-4 focus:py-2 focus:font-bold focus:text-ink">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 bg-ink text-white shadow-[0_1px_0_rgba(255,255,255,0.06)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to={home} className="flex min-w-0 items-center gap-3">
            <Logo className="h-9 w-9 shrink-0" />
            <div className="min-w-0 leading-none">
              <p className="truncate font-display text-xl font-extrabold uppercase tracking-tight">Bachpan Cricket League</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-lime">
                {isAdmin ? 'Admin console' : 'Local cricket fantasy'}
              </p>
            </div>
          </Link>

          <nav className="hidden h-full items-stretch md:flex" aria-label="Main">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 px-4 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-lime'
                      : 'text-slate-400 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="chip hidden bg-gold/15 text-gold ring-1 ring-inset ring-gold/30 sm:inline-flex">
                <ClipboardList className="h-3 w-3" aria-hidden="true" />
                Admin
              </span>
            )}
            <div className="hidden items-center gap-2 pl-2 sm:flex">
              <Avatar name={auth?.name || 'U'} className="h-8 w-8 text-xs" />
              <span className="max-w-[10rem] truncate text-sm font-semibold text-slate-200">{auth?.name}</span>
            </div>
            <button
              type="button"
              className="rounded-xl p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              onClick={() => setConfirmLogout(true)}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:pt-8 md:pb-12">
        <div key={pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile tab bar */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${
                  isActive ? 'text-pitch-700' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-pitch-50' : ''}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <LogoutDialog open={confirmLogout} onClose={() => setConfirmLogout(false)} />
    </div>
  );
}
