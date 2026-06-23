import { Checkbox, Input, Switch } from "@heroui/react";

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
          <Input id="ds-name" placeholder="Ada Lovelace" />
          <Input placeholder="Lower-emphasis (secondary)" variant="secondary" />
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
    </Section>
  );
}
