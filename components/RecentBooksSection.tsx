import { Search } from "lucide-react";

import { sampleBooks } from "@/lib/constant";
import BookCard from "./BookCard";

export function RecentBooksSection() {
  return (
    <section className="mx-auto mt-[54px] w-full max-w-[997px] px-4 lg:px-0">
      <div className="library-filter-bar">
        <h2 className="section-title">Recent Books</h2>

        <label className="library-search-wrapper h-[34px] sm:w-[258px]">
          <span className="sr-only">Search books</span>
          <input
            type="search"
            placeholder="Search books..."
            className="library-search-input h-full py-0 text-sm"
          />
          <Search
            className="mr-3 size-5 shrink-0 text-[#111827]"
            strokeWidth={2}
            aria-hidden="true"
          />
        </label>
      </div>

      <div className="library-books-grid">
        {sampleBooks.map((book) => (
          <BookCard
            key={book.slug}
            title={book.title}
            author={book.author}
            coverURL={book.coverURL}
            slug={book.slug}
          />
        ))}
      </div>
    </section>
  );
}
