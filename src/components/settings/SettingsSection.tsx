interface SettingsSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function SettingsSection({ 
  children, 
  title, 
  description, 
  className = "space-y-4 p-6" 
}: SettingsSectionProps) {
  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-400">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
