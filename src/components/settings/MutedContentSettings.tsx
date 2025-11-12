import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserX, Tag, X } from 'lucide-react';

/**
 * Muted Content Settings
 * Allows users to mute specific pubkeys and hashtags
 */
export function MutedContentSettings() {
  const [mutedPubkeys, setMutedPubkeys] = useState<string[]>([]);
  const [mutedHashtags, setMutedHashtags] = useState<string[]>([]);
  const [pubkeyInput, setPubkeyInput] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');

  const handleAddPubkey = () => {
    if (pubkeyInput.trim() && !mutedPubkeys.includes(pubkeyInput.trim())) {
      setMutedPubkeys([...mutedPubkeys, pubkeyInput.trim()]);
      setPubkeyInput('');
    }
  };

  const handleRemovePubkey = (pubkey: string) => {
    setMutedPubkeys(mutedPubkeys.filter(p => p !== pubkey));
  };

  const handleAddHashtag = () => {
    const cleanTag = hashtagInput.trim().replace(/^#/, '').toLowerCase();
    if (cleanTag && !mutedHashtags.includes(cleanTag)) {
      setMutedHashtags([...mutedHashtags, cleanTag]);
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (hashtag: string) => {
    setMutedHashtags(mutedHashtags.filter(h => h !== hashtag));
  };

  return (
    <div className="space-y-4">
      {/* Muted Users */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Muted Users</p>
            <p className="text-xs text-muted-foreground">
              Hide content from specific users by their public key
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {/* Add Pubkey Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="pubkey-input" className="sr-only">
                Public Key
              </Label>
              <Input
                id="pubkey-input"
                placeholder="npub1... or hex pubkey"
                value={pubkeyInput}
                onChange={(e) => setPubkeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPubkey()}
              />
            </div>
            <Button onClick={handleAddPubkey} size="sm">
              Add
            </Button>
          </div>

          {/* Muted Pubkeys List */}
          {mutedPubkeys.length > 0 ? (
            <div className="space-y-2">
              {mutedPubkeys.map((pubkey) => (
                <div
                  key={pubkey}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <span className="text-sm font-mono truncate flex-1">
                    {pubkey.slice(0, 16)}...{pubkey.slice(-8)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePubkey(pubkey)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No muted users yet
            </p>
          )}
        </div>
      </div>

      {/* Muted Hashtags */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Muted Hashtags</p>
            <p className="text-xs text-muted-foreground">
              Hide content containing specific hashtags
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {/* Add Hashtag Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="hashtag-input" className="sr-only">
                Hashtag
              </Label>
              <Input
                id="hashtag-input"
                placeholder="#hashtag"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddHashtag()}
              />
            </div>
            <Button onClick={handleAddHashtag} size="sm">
              Add
            </Button>
          </div>

          {/* Muted Hashtags List */}
          {mutedHashtags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mutedHashtags.map((hashtag) => (
                <Badge
                  key={hashtag}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  #{hashtag}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveHashtag(hashtag)}
                    className="h-4 w-4 p-0 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No muted hashtags yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
