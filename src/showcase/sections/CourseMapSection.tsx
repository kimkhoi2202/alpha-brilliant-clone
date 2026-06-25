import {
  CourseCard,
  CourseMap,
  CurrentLessonCard,
  LevelHeader,
  PythagorasArt,
} from "../../components/course";
import { Section } from "../Section";

export function CourseMapSection() {
  return (
    <Section
      id="course-map"
      title="Course map"
      description="Brilliant's learning path: the course summary card, a level banner, a meandering column of 3D lesson pucks (completed / active / locked) with the current step pinned, and the anchored start card."
    >
      <div className="grid gap-8 md:grid-cols-[minmax(0,260px)_1fr]">
        <div className="h-fit md:sticky md:top-24">
          <CourseCard
            art={<PythagorasArt />}
            title="The Pythagorean Theorem"
            description="Learn right triangles by dragging, plotting, and building your way to a² + b² = c²."
            lessons={5}
            exercises={9}
          />
        </div>

        <div className="mx-auto w-full max-w-md">
          <CourseMap
            header={<LevelHeader level={6} title="Pythagoras' Geometry" />}
            nodes={[
              {
                id: "thm",
                label: "The Pythagorean Theorem",
                state: "completed",
                onPress: () => {},
              },
              {
                id: "triples",
                label: "Pythagorean Triples",
                state: "active",
                selected: true,
                onPress: () => {},
              },
              { id: "squares", label: "Squares and Roots", state: "locked" },
              {
                id: "special",
                label: "Special Right Triangles",
                state: "locked",
              },
              { id: "apps", label: "Applications", state: "locked" },
            ]}
            footer={
              <CurrentLessonCard
                subtitle="Continue"
                title="Pythagorean Triples"
                onStart={() => {}}
              />
            }
          />
        </div>
      </div>
    </Section>
  );
}
