import React, { useState } from 'react';
import { Book } from '../types/library';

interface BookCoverProps {
  book: Pick<Book, 'title' | 'author' | 'coverUrl' | 'coverAccent' | 'category' | 'year'>;
  className?: string;
}

export const BookCover: React.FC<BookCoverProps> = ({ book, className = '' }) => {
  const [imgError, setImgError] = useState(false);

  if (book.coverUrl && !imgError) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 border border-slate-200 ${className}`}>
        <img
          src={book.coverUrl}
          alt={`Sampul buku ${book.title}`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden border border-slate-200 p-4 text-white ${className}`}
      style={{ backgroundColor: book.coverAccent || '#1E293B' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-black/20 border-r border-white/15"
      />
      <div className="pl-2">
        <p className="text-[11px] font-mono tracking-wider text-white/75">{book.year}</p>
        <p className="mt-1 text-[11px] text-white/80 line-clamp-1">{book.category}</p>
      </div>
      <div className="pl-2 my-auto">
        <h4 className="font-serif text-sm sm:text-base font-semibold leading-snug text-white line-clamp-3">
          {book.title}
        </h4>
      </div>
      <div className="pl-2 border-t border-white/20 pt-2">
        <p className="text-[11px] font-medium text-white/85 truncate">{book.author}</p>
      </div>
    </div>
  );
};
