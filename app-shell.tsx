import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  Download,
  Heart,
  Home,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import logoAsset from "@/assets/smart-point-logo.png";
import { CategoryIcon } from "@/components/category-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { categoriesQuery } from "@/lib/catalog";
import {
  getSeenAt,
  markNotificationsSeen,
  newTemplatesQuery,
} from "@/lib/notifications";
import {
  cacheWhopUser,
  getWhopUser,
  type WhopUser,
} from "@/lib/whop";
import { getWhopIdentity } from "@/lib/whop.functions";
import { cn } from "@/lib/utils";

const NAV = [
  {
    to: "/",
    label: "Home",
    icon: Home,
  },
  {
    to: "/favoris",
    label: "Favorites",
    icon: Heart,
  },
  {
    to: "/telechargements",
    label: "Downloads",
    icon: Download,
  },
] as const;

/* =========================================================
   SMART POINT WHOP USER
   ========================================================= */

export type SmartPointWhopUser = WhopUser & {
  isAuthenticated: boolean;
};

/**
 * Returns the current Smart Point user.
 *
 * identity.data = real Whop authentication
 *
 * fallback = local/display fallback only.
 *
 * IMPORTANT:
 * A fallback user is NEVER considered authenticated.
 */
export function useWhopUser(): SmartPointWhopUser {
  const [fallback, setFallback] =
    useState<WhopUser>({
      id: "whop-preview-user",
      name: "Visitor",
      plan: "Free Visitor",
    });

  useEffect(() => {
    setFallback(getWhopUser());
  }, []);

  const fetchIdentity =
    useServerFn(getWhopIdentity);

  const identity = useQuery({
    queryKey: ["whop-identity"],
    queryFn: () => fetchIdentity(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (identity.data) {
      cacheWhopUser(identity.data);
    }
  }, [identity.data]);

  /*
   * REAL WHOP USER
   */
  if (identity.data) {
    return {
      ...identity.data,
      isAuthenticated: true,
    };
  }

  /*
   * EXTERNAL VISITOR
   */
  return {
    ...fallback,
    isAuthenticated: false,
  };
}

/* =========================================================
   APP SHELL
   ========================================================= */

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const routerState = useRouterState();

  const user = useWhopUser();

  const categories = useQuery(
    categoriesQuery(),
  );

  const newTemplates = useQuery(
    newTemplatesQuery(),
  );

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const notificationsRef =
    useRef<HTMLDivElement>(null);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const pathname =
    routerState.location.pathname;

  const seenAt = getSeenAt();

  const unseenCount =
    (newTemplates.data ?? []).filter(
      (template) => {
        if (!seenAt) return true;

        return (
          new Date(
            template.created_at,
          ).getTime() >
          seenAt
        );
      },
    ).length;

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(
          event.target as Node,
        )
      ) {
        setNotificationsOpen(false);
      }
    }

    if (notificationsOpen) {
      document.addEventListener(
        "mousedown",
        handleOutsideClick,
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, [notificationsOpen]);

  function handleOpenNotifications() {
    setNotificationsOpen(
      (current) => !current,
    );

    if (unseenCount > 0) {
      markNotificationsSeen();
    }
  }

  function handleSearchSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value =
      searchQuery.trim();

    if (!value) return;

    window.location.href =
      `/?search=${encodeURIComponent(value)}`;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ===================================================
          HEADER
          =================================================== */}

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-4 px-4 lg:px-6">
          {/* LOGO */}

          <Link
            to="/"
            className="flex shrink-0 items-center gap-2"
          >
            <img
              src={logoAsset}
              alt="Smart Point"
              className="h-9 w-auto"
            />

            <span className="hidden text-lg font-bold sm:block">
              Smart Point
            </span>
          </Link>

          {/* SEARCH */}

          <form
            onSubmit={handleSearchSubmit}
            className="hidden min-w-0 flex-1 md:block"
          >
            <div className="relative mx-auto max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                placeholder="Search templates..."
                className="h-10 w-full rounded-lg border border-border bg-muted/30 pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </form>

          {/* NAVIGATION */}

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map(
              ({
                to,
                label,
                icon: Icon,
              }) => {
                const active =
                  pathname === to;

                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />

                    {label}
                  </Link>
                );
              },
            )}
          </nav>

          {/* RIGHT SIDE */}

          <div className="ml-auto flex items-center gap-2">
            {/* MOBILE SEARCH */}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() =>
                setSearchOpen(
                  (current) => !current,
                )
              }
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* NOTIFICATIONS */}

            <div
              ref={notificationsRef}
              className="relative"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={
                  handleOpenNotifications
                }
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />

                {unseenCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unseenCount > 9
                      ? "9+"
                      : unseenCount}
                  </span>
                )}
              </Button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  <div className="border-b border-border p-4">
                    <h3 className="font-semibold">
                      Notifications
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      New Smart Point templates
                    </p>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {(newTemplates.data ?? [])
                      .slice(0, 8)
                      .map(
                        (template) => (
                          <Link
                            key={
                              template.id
                            }
                            to="/"
                            className="block border-b border-border p-4 transition hover:bg-muted/50"
                            onClick={() =>
                              setNotificationsOpen(
                                false,
                              )
                            }
                          >
                            <p className="text-sm font-medium">
                              {template.title}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              New template
                              available
                            </p>
                          </Link>
                        ),
                      )}

                    {(
                      newTemplates.data ??
                      []
                    ).length === 0 && (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No new templates.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* THEME */}

            <ThemeToggle />

            {/* USER */}

            <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
              <div className="min-w-0 text-right">
                <p className="max-w-[140px] truncate text-sm font-medium">
                  {user.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {user.isAuthenticated
                    ? `⭐ ${user.plan}`
                    : "Visitor"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE SEARCH */}

        {searchOpen && (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <form
              onSubmit={handleSearchSubmit}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  autoFocus
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value,
                    )
                  }
                  placeholder="Search templates..."
                  className="h-10 w-full rounded-lg border border-border bg-muted/30 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </form>
          </div>
        )}
      </header>

      {/* ===================================================
          MOBILE NAVIGATION
          =================================================== */}

      <div className="border-b border-border lg:hidden">
        <nav className="mx-auto flex max-w-[1800px] items-center gap-1 overflow-x-auto px-4 py-2">
          {NAV.map(
            ({
              to,
              label,
              icon: Icon,
            }) => {
              const active =
                pathname === to;

              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />

                  {label}
                </Link>
              );
            },
          )}
        </nav>
      </div>

      {/* ===================================================
          MAIN
          =================================================== */}

      <main className="mx-auto max-w-[1800px]">
        {children}
      </main>
    </div>
  );
}