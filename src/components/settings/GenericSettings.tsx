import { SettingsSection } from './SettingsSection';

interface GenericSettingsProps {
  sectionId: string;
  title: string;
}

export function GenericSettings({ title }: GenericSettingsProps) {
  return (
    <SettingsSection
      title={title}
      description="This section is coming soon."
    >
      <div />
    </SettingsSection>
  );
}
