import UploadForm from "@/components/UploadForm";

export default function NewBookPage() {
  return (
    <main className="wrapper container">
      <section className="mx-auto w-full max-w-[579px]">
        <div className="mb-8">
          <h1 className="font-serif text-[40px] font-semibold leading-[48px] text-black">
            Add a New Book
          </h1>
          <p className="mt-4 text-[17px] leading-6 text-[#4f5360]">
            Upload a PDF to generate your interactive reading experience
          </p>
          <p className="mt-4 text-[13px] leading-5 text-[#3f3f3f]">
            5 of 10 books used (Upgrade)
          </p>
        </div>

        <UploadForm />
      </section>
    </main>
  );
}
