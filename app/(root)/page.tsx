import { HeroSection } from "@/components/HeroSection";
import { RecentBooksSection } from "@/components/RecentBooksSection";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: PageProps<"/">) {
  const { query = "" } = await searchParams;
  const searchQuery = Array.isArray(query) ? (query[0] ?? "") : query;

  return (
    <main className="min-h-screen bg-(--bg-primary) pt-20.5 pb-16">
      <HeroSection />
      <RecentBooksSection query={searchQuery} />
    </main>
  );
}
