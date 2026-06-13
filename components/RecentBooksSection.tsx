import { BookSearch } from "./BookSearch";
import BookCard from "./BookCard";
import { getAllBooks } from "@/lib/actions/book.actions";

type RecentBooksSectionProps = {
  query?: string;
};

export async function RecentBooksSection({
  query = "",
}: RecentBooksSectionProps) {
  const bookResults = await getAllBooks(query);
  const books = bookResults.success ? (bookResults.data ?? []) : [];
  const hasSearchQuery = query.trim().length > 0;

  return (
    <section className="mx-auto mt-13.5 w-full max-w-249.25 px-4 lg:px-0">
      <div className="library-filter-bar">
        <h2 className="section-title">Recent Books</h2>
        <BookSearch query={query} />
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
            {hasSearchQuery ? "No matching books" : "No books yet"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#3d485e]">
            {hasSearchQuery
              ? `No books match "${query.trim()}". Try another title or author.`
              : "Upload your first PDF to start building your library."}
          </p>
        </div>
      )}
    </section>
  );
}
