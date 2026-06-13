import { Search } from "lucide-react";
import BookCard from "./BookCard";
import { getAllBooks } from "@/lib/actions/book.actions";

export async function RecentBooksSection() {
  const bookResults = await getAllBooks();
  const books = bookResults.success ? (bookResults.data ?? []) : [];

  return (
    <section className="mx-auto mt-13.5 w-full max-w-249.25 px-4 lg:px-0">
      <div className="library-filter-bar">
        <h2 className="section-title">Recent Books</h2>

        <label className="library-search-wrapper h-8.5 sm:w-64.5">
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

      {books.length > 0 ? (
        <div className="library-books-grid">
          {books.map((book) => (
            <BookCard
              key={book.slug}
              title={book.title}
              author={book.author}
              coverURL={book.coverURL}
              slug={book.slug}
            />
          ))}
        </div>
      ) : (
        <div className="library-empty-card text-center">
          <h3 className="font-serif text-2xl font-semibold text-[#212a3b]">
            No books yet
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#3d485e]">
            Upload your first PDF to start building your library.
          </p>
        </div>
      )}
    </section>
  );
}
