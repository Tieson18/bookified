"use client";
import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const navItems = [
    { label: "Library", href: "/" },
    { label: "Add New", href: "/books/new", signedInOnly: true },
  ];

  const pathName = usePathname();

  const authButtonClass =
    "h-10 whitespace-nowrap rounded-[8px] px-3 text-sm font-medium text-black transition-opacity hover:opacity-70 sm:px-4 sm:text-base";
  const signUpButtonClass =
    "h-10 whitespace-nowrap rounded-[8px] bg-[var(--color-brand)] px-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] sm:px-4 sm:text-base";

  const { user } = useUser();
  return (
    <header className="w-full fixed z-50 bg-(--bg-primary)">
      <div className="navbar-height mx-auto flex w-full max-w-249.25 items-center justify-between px-4 py-4 lg:px-0">
        <Link href="/" className="flex gap-0.5 items-center">
          <Image
            src="/assets/logo.png"
            alt="Bookified"
            width={42}
            height={26}
          />
          <span className="logo-text">Bookified</span>
        </Link>

        <nav className="w-fit flex gap-3 sm:gap-7.5 items-center">
          {navItems.map(({ label, href, signedInOnly }) => {
            const isActive =
              pathName === href || (href !== "/" && pathName.startsWith(href));

            const navLink = (
              <Link
                key={label}
                href={href}
                className={cn(
                  "nav-link-base",
                  isActive ? "nav-link-active" : "text-black hover:opacity-70",
                )}
              >
                {label}
              </Link>
            );

            if (signedInOnly) {
              return (
                <Show key={label} when="signed-in">
                  {navLink}
                </Show>
              );
            }

            return navLink;
          })}

          <Show when="signed-out">
            <div className="flex items-center gap-2">
              <SignInButton mode="modal">
                <button type="button" className={authButtonClass}>
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button type="button" className={signUpButtonClass}>
                  Sign up
                </button>
              </SignUpButton>
            </div>
          </Show>

          <Show when="signed-in">
            <div className="nav-user-link">
              <UserButton />
              {user?.firstName && (
                <Link href={"/subscriptions"} className="nav-user-name">
                  {user.firstName}
                </Link>
              )}
            </div>
          </Show>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
