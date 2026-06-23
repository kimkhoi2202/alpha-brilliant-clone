import { useState } from "react";

import {
  CourseCard,
  CourseCategoryCard,
  CurrentLessonCard,
} from "../../components/course";
import { OptionCard } from "../../components/ui";
import { Section, Subhead } from "../Section";

const categories = [
  { id: "puzzles", label: "100 Days of Puzzles", icon: "🧩" },
  { id: "strategy", label: "Strategy Puzzles", icon: "♟️" },
  { id: "numbers", label: "Number Theory", icon: "🔢" },
  { id: "geometry", label: "Geometric Thinking", icon: "📐" },
];

const goals = [
  { id: "10", label: "10 min" },
  { id: "20", label: "20 min" },
  { id: "30", label: "30 min" },
  { id: "60", label: "60 min" },
];

export function Cards() {
  const [goal, setGoal] = useState("10");

  return (
    <Section
      id="cards"
      title="Cards"
      description="Course catalog + onboarding surfaces. Illustrations are placeholders."
    >
      <Subhead>Course card</Subhead>
      <div className="grid gap-4 sm:grid-cols-2">
        <CourseCard
          icon="📐"
          title="Solving Equations"
          description="Start your algebra journey with an introduction to variables and equations."
          lessons={68}
          exercises={895}
          onPress={() => {}}
        />
        <CourseCard
          icon="🧮"
          title="Arithmetic Thinking"
          description="Learn to wield important tools in number sense and computation."
          lessons={92}
          exercises={1214}
        />
      </div>

      <Subhead className="mt-6">Course category cards (+ archived)</Subhead>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
        {categories.map((c) => (
          <CourseCategoryCard
            key={c.id}
            icon={c.icon}
            label={c.label}
            onPress={() => {}}
          />
        ))}
        <CourseCategoryCard
          icon="🪐"
          label="Special Relativity"
          archived
          onPress={() => {}}
        />
      </div>

      <Subhead className="mt-6">Selectable option cards (onboarding)</Subhead>
      <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
        {goals.map((g) => (
          <OptionCard
            key={g.id}
            icon="⏱️"
            label={g.label}
            selected={goal === g.id}
            onPress={() => setGoal(g.id)}
          />
        ))}
      </div>

      <Subhead className="mt-6">Current lesson card</Subhead>
      <div className="max-w-xs">
        <CurrentLessonCard subtitle="Up next" title="Finding Half" onStart={() => {}} />
      </div>
    </Section>
  );
}
