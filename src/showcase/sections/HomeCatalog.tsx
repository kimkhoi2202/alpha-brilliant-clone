import { CatalogShelf, CourseThumbnailTile } from "../../components/catalog";
import {
  PremiumUpsellCard,
  RecommendedCourseDeck,
} from "../../components/home";
import { Disclosure } from "../../components/ui";
import { Section, Subhead } from "../Section";

type Tile = {
  id: string;
  label: string;
  icon: string;
  badge?: "new";
  progress?: number;
};

const tiles: Tile[] = [
  { id: "int", label: "Intro to Algebra", icon: "🧮", badge: "new" },
  { id: "frac", label: "Fractions", icon: "➗", progress: 60 },
  { id: "num", label: "Number Theory", icon: "🔢" },
  { id: "geo", label: "Geometry", icon: "📐" },
  { id: "prob", label: "Probability", icon: "🎲" },
];

const archived: Tile[] = [
  { id: "cm", label: "Classical Mechanics", icon: "⚙️" },
  { id: "gt", label: "Group Theory", icon: "🔷" },
  { id: "la", label: "Linear Algebra", icon: "📊" },
  { id: "sr", label: "Special Relativity", icon: "🪐" },
];

export function HomeCatalog() {
  return (
    <Section
      id="home-catalog"
      title="Home & catalog"
      description="Home hero deck + premium upsell, and the course catalog shelf with NEW badges, progress, and a collapsible archived section."
    >
      <Subhead>Home rail</Subhead>
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <RecommendedCourseDeck
          course="Solving Equations"
          level="Level 1"
          icon="📐"
          nextLesson="Finding Unknowns"
          onStart={() => {}}
        />
        <PremiumUpsellCard onPress={() => {}} />
      </div>

      <Subhead className="mt-8">Course catalog</Subhead>
      <CatalogShelf
        title="Foundations for Algebra"
        subtitle="Step-by-step paths to mastery"
      >
        {tiles.map((t) => (
          <div key={t.id} className="w-32 shrink-0">
            <CourseThumbnailTile
              icon={t.icon}
              label={t.label}
              badge={t.badge}
              progress={t.progress}
              onPress={() => {}}
            />
          </div>
        ))}
      </CatalogShelf>

      <Disclosure title="Archived courses" className="mt-4">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {archived.map((t) => (
            <div key={t.id} className="w-32 shrink-0">
              <CourseThumbnailTile
                icon={t.icon}
                label={t.label}
                archived
                onPress={() => {}}
              />
            </div>
          ))}
        </div>
      </Disclosure>
    </Section>
  );
}
