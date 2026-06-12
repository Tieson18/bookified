import { HeroSection } from "@/components/HeroSection";
import { RecentBooksSection } from "@/components/RecentBooksSection";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="min-h-screen bg-(--bg-primary) pt-20.5 pb-16">
      <HeroSection />
      <RecentBooksSection />
    </main>
  );
}
