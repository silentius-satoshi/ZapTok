import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/**
 * Content Moderation Settings
 * Settings for content filtering and moderation preferences
 */
export function ContentModerationSettings() {
  return (
    <div className="space-y-4">
      {/* Content Filters */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-center">Content Filters</p>
        <div className="space-y-4">
          {/* Hide NSFW Content */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hide-nsfw" className="text-sm font-medium">
                Hide NSFW Content
              </Label>
              <p className="text-xs text-muted-foreground">
                Filter content marked as sensitive or adult
              </p>
            </div>
            <Switch id="hide-nsfw" />
          </div>

          {/* Require Content Warnings */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-cw" className="text-sm font-medium">
                Respect Content Warnings
              </Label>
              <p className="text-xs text-muted-foreground">
                Blur content with content warnings until clicked
              </p>
            </div>
            <Switch id="require-cw" />
          </div>

          {/* Minimum Content Length */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="min-length" className="text-sm font-medium">
                Filter Short Posts
              </Label>
              <p className="text-xs text-muted-foreground">
                Hide posts shorter than 10 characters (reduces spam)
              </p>
            </div>
            <Switch id="min-length" />
          </div>
        </div>
      </div>

      {/* Spam Protection */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-center">Spam Protection</p>
        <div className="space-y-4">
          {/* Hide Content from Untrusted Users */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="wot-filter" className="text-sm font-medium">
                Web of Trust Filter
              </Label>
              <p className="text-xs text-muted-foreground">
                Only show content from your network (see Web of Trust settings)
              </p>
            </div>
            <Switch id="wot-filter" />
          </div>

          {/* Hide Content Mentioning Muted Users */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hide-mentions" className="text-sm font-medium">
                Hide Muted User Mentions
              </Label>
              <p className="text-xs text-muted-foreground">
                Hide posts that mention muted users
              </p>
            </div>
            <Switch id="hide-mentions" />
          </div>
        </div>
      </div>

      {/* Privacy & Safety */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-center">Privacy & Safety</p>
        <div className="space-y-4">
          {/* Blur Media by Default */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="blur-media" className="text-sm font-medium">
                Blur Media by Default
              </Label>
              <p className="text-xs text-muted-foreground">
                Click to reveal images and videos
              </p>
            </div>
            <Switch id="blur-media" />
          </div>

          {/* Hide Reactions from Muted Users */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hide-muted-reactions" className="text-sm font-medium">
                Hide Muted User Reactions
              </Label>
              <p className="text-xs text-muted-foreground">
                Don't show likes/reposts from muted users
              </p>
            </div>
            <Switch id="hide-muted-reactions" />
          </div>
        </div>
      </div>
    </div>
  );
}
