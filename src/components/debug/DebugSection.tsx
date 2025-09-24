import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useToast } from '@/hooks/useToast';

interface DebugSectionProps {
  title: string;
  icon: ReactNode;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  children: ReactNode;
  copyData?: any;
  className?: string;
}

/**
 * Reusable debug section component with collapsible content and copy functionality
 */
export function DebugSection({
  title,
  icon,
  isExpanded,
  onExpandedChange,
  children,
  copyData,
  className,
}: DebugSectionProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!copyData) return;

    try {
      const textToCopy = typeof copyData === 'string' 
        ? copyData 
        : JSON.stringify(copyData, null, 2);
      
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied to clipboard",
        description: `${title} debug information copied`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className}>
      <Collapsible open={isExpanded} onOpenChange={onExpandedChange}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span className={isMobile ? 'text-sm' : ''}>{title}</span>
            </div>
            <div className="flex items-center gap-2">
              {copyData && (
                <Copy 
                  className="h-4 w-4 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                  }}
                />
              )}
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}