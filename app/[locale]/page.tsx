import { resolveLocale } from "@/lib/i18n/config";
import { SiteShell } from "@/components/home/SiteShell";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { Intro } from "@/components/home/Intro";
import { Services } from "@/components/home/Services";
import { Fleet } from "@/components/home/Fleet";
import { Experience } from "@/components/home/Experience";
import { Hotels } from "@/components/home/Hotels";
import { Connections } from "@/components/home/Connections";
import { Reviews } from "@/components/home/Reviews";

/** Homepage template – milestone 1. Sections alternate black / white. */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = resolveLocale(locale);
  return (
    <SiteShell locale={loc}>
      <Hero locale={loc} />
      <Marquee locale={loc} />
      <Intro locale={loc} />
      <Services locale={loc} />
      <Fleet locale={loc} />
      <Experience locale={loc} />
      <Hotels locale={loc} />
      <Connections locale={loc} />
      <Reviews locale={loc} />
    </SiteShell>
  );
}
