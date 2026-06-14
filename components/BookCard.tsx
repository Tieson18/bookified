import Image from "next/image";
import Link from "next/link";

type BookCardProps = {
  title: string;
  author: string;
  coverURL: string;
  slug: string;
};

const BookCard = ({ title, author, coverURL, slug }: BookCardProps) => {
  return (
    <Link href={`/books/${slug}`} key={slug} className="book-card-link">
      <article className="book-card group">
        <figure className="book-card-figure">
          <div className="book-card-cover-wrapper">
            <Image
              src={coverURL}
              alt={`${title} book cover`}
              width={150}
              height={220}
              className="book-card-cover"
              sizes="(min-width: 1280px) 150px, (min-width: 768px) 140px, 45vw"
            />
          </div>
          <figcaption className="book-card-meta">
            <h3 className="book-card-title">{title}</h3>
            <p className="book-card-author">{author}</p>
          </figcaption>
        </figure>
      </article>
    </Link>
  );
};

export default BookCard;
