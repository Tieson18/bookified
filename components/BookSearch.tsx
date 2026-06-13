"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

type BookSearchProps = {
  query: string;
};

export function BookSearch({ query }: BookSearchProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [value, setValue] = useOptimistic(query);
  const [isPending, startTransition] = useTransition();

  const updateSearch = (nextValue: string) => {
    const params = new URLSearchParams();

    if (nextValue.trim()) {
      params.set("query", nextValue);
    }

    const search = params.toString();

    startTransition(() => {
      setValue(nextValue);
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    });
  };

  return (
    <label
      className="library-search-wrapper h-8.5 sm:w-64.5"
      aria-busy={isPending}
    >
      <span className="sr-only">Search books by title or author</span>
      <input
        type="search"
        value={value}
        onChange={(event) => updateSearch(event.target.value)}
        placeholder="Search books..."
        maxLength={100}
        className="library-search-input h-full py-0 text-sm"
      />
      <Search
        className="mr-3 size-5 shrink-0 text-[#111827]"
        strokeWidth={2}
        aria-hidden="true"
      />
    </label>
  );
}
