import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useToast } from '@/hooks/useToast';

interface DebugInfoPanelProps {
  title: string;
  data: any;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * Standardized panel for displaying debug information with JSON formatting
 */
export function DebugInfoPanel({ 
  title, 
  data, 
  className,
  defaultExpanded = false 
}: DebugInfoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      const textToCopy = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied to clipboard",
        description: `${title} information copied`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">No data available</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
      </CardHeader>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <pre className={`whitespace-pre-wrap break-all bg-muted/50 rounded-md p-3 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}