import { Checkbox, Input, Switch } from "@heroui/react";

import { Search } from "../../components/ui";
import { Section, Subhead } from "../Section";

export function Forms() {
  return (
    <Section
      id="forms"
      title="Form controls"
      description="Accessible inputs and selection controls, themed to the Brilliant palette."
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <Subhead>Text input</Subhead>
          <label htmlFor="ds-name" className="block text-sm font-medium">
            Display name
          </label>
          <Input id="ds-name" fullWidth placeholder="Ada Lovelace" />
          <Input
            fullWidth
            placeholder="Lower-emphasis (secondary)"
            variant="secondary"
          />
        </div>

        <div className="space-y-4">
          <Subhead>Selection</Subhead>
          <Checkbox defaultSelected>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Keep me signed in
            </Checkbox.Content>
          </Checkbox>
          <Checkbox isDisabled>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Disabled option
            </Checkbox.Content>
          </Checkbox>
          <Switch defaultSelected>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Sound effects
            </Switch.Content>
          </Switch>
        </div>
      </div>

      <div className="mt-10 max-w-lg">
        <Subhead>Search (expands to a query panel)</Subhead>
        <Search
          results={[
            { id: "1", label: "Pythagorean Theorem" },
            { id: "2", label: "Pythagorean Triples" },
            { id: "3", label: "How do large language models work?" },
            { id: "4", label: "Visualize fractions" },
            { id: "5", label: "Special right triangles" },
          ]}
        />
      </div>
    </Section>
  );
}
