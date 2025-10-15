import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface DebugStatusCardProps {
  title: string;
  status: 'connected' | 'partial' | 'disconnected' | 'error' | 'info';
  description?: string;
  details?: string[];
  className?: string;
}

/**
 * Summary status card for quick overview of debug sections
 */
export function DebugStatusCard({
  title,
  status,
  description,
  details = [],
  className,
}: DebugStatusCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          badge: 'default' as const,
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          borderColor: 'border-green-200 dark:border-green-800',
        };
      case 'partial':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
          badge: 'secondary' as const,
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
        };
      case 'disconnected':
        return {
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          badge: 'destructive' as const,
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200 dark:border-red-800',
        };
      case 'error':
        return {
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          badge: 'destructive' as const,
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200 dark:border-red-800',
        };
      default:
        return {
          icon: <Info className="h-4 w-4 text-blue-600" />,
          badge: 'outline' as const,
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Card className={`${config.bgColor} ${config.borderColor} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              {config.icon}
              <h3 className="font-medium text-sm">{title}</h3>
            </div>
            
            <Badge variant={config.badge} className="text-xs">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>

            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}

            {details.length > 0 && (
              <div className="space-y-1">
                {details.map((detail, index) => (
                  <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-1 h-1 bg-current rounded-full" />
                    {detail}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}