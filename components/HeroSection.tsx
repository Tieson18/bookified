import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Upload PDF",
    description: "Add your book file",
  },
  {
    number: 2,
    title: "AI Processing",
    description: "We analyze the content",
  },
  {
    number: 3,
    title: "Voice Chat",
    description: "Discuss with AI",
  },
];

export function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-[997px] px-4 lg:px-0">
      <div className="min-h-[260px] rounded-[10px] bg-[#f3e4c7] px-7 py-8 sm:px-8 lg:px-8">
        <div className="grid h-full min-h-[196px] grid-cols-1 items-center gap-8 lg:grid-cols-[330px_310px_184px] lg:gap-[54px]">
          <div className="max-w-[360px]">
            <h1 className="font-serif text-[31px] leading-[38px] font-semibold text-black">
              Your Library
            </h1>
            <p className="mt-2.5 text-[14.5px] leading-[22px] text-[#5f5a54]">
              Convert your books into interactive AI conversations. Listen,
              learn, and discuss your favorite reads.
            </p>
            <Link
              href="/books/new"
              className="mt-3.5 inline-flex h-[43px] items-center gap-2 rounded-[8px] bg-white px-4 font-serif text-[17px] font-bold text-[#2b2b2b] shadow-sm transition-colors hover:bg-[#fffaf0]"
            >
              <Plus className="size-5 stroke-[2.4]" aria-hidden="true" />
              Add new book
            </Link>
          </div>

          <div className="flex justify-center lg:justify-start">
            <Image
              src="/assets/hero-illustration.png"
              alt="Vintage books, an open book, a globe, and a desk lamp"
              width={491}
              height={352}
              priority
              className="h-auto w-[265px] sm:w-[300px] lg:w-[310px]"
            />
          </div>

          <div className="w-full max-w-[184px] rounded-[8px] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(33,42,59,0.04)] justify-self-center lg:justify-self-end">
            <ol className="space-y-[15px]">
              {steps.map(({ number, title, description }) => (
                <li
                  key={number}
                  className="grid grid-cols-[28px_1fr] items-start gap-2.5"
                >
                  <span className="flex size-[27px] items-center justify-center rounded-full border border-[#6e665a] text-[14px] leading-none text-[#4a453f]">
                    {number}
                  </span>
                  <span>
                    <span className="block text-[14px] leading-[18px] font-semibold text-[#2f2f2f]">
                      {title}
                    </span>
                    <span className="mt-1 block text-[12px] leading-[16px] text-[#56524d]">
                      {description}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
      <div className="library-hero-grid"></div>
    </section>
  );
}
