import {
  CourseMap,
  CurrentLessonCard,
  LevelHeader,
} from "../../components/course";
import { Section } from "../Section";

export function CourseMapSection() {
  return (
    <Section
      id="course-map"
      title="Course map"
      description="The learning path: level header, lesson nodes (completed / active / locked), connectors, and the anchored current-lesson card. Medallions are placeholders."
    >
      <div className="mx-auto max-w-sm">
        <CourseMap
          header={<LevelHeader level={1} title="Visualize Fractions" />}
          nodes={[
            { id: "intro", label: "Introduction", state: "completed", onPress: () => {} },
            { id: "half", label: "Finding Half", state: "active", onPress: () => {} },
            { id: "combine", label: "Combining Parts", state: "locked" },
            { id: "split", label: "Splitting Parts", state: "locked" },
          ]}
          footer={
            <CurrentLessonCard
              subtitle="Continue"
              title="Finding Half"
              onStart={() => {}}
            />
          }
        />
      </div>
    </Section>
  );
}
