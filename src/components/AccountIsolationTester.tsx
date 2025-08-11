import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, Copy } from 'lucide-react';
import { useLatestProfile } from '@/test/AccountIsolationVerifier';
import { useToast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';

/**
 * Development component for testing and verifying account isolation
 * This component helps verify that new account creation doesn't contaminate existing accounts
 */
export function AccountIsolationTester() {
  const [originalPubkey, setOriginalPubkey] = useState('');
  const [newPubkey, setNewPubkey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  // Fetch profiles using the verification hook
  const originalProfile = useLatestProfile(originalPubkey);
  const newProfile = useLatestProfile(newPubkey);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const normalizeInput = (input: string): string => {
    const cleaned = input.trim();
    
    // If it's an npub, convert to hex
    if (cleaned.startsWith('npub1')) {
      try {
        const decoded = nip19.decode(cleaned);
        if (decoded.type === 'npub') {
          return decoded.data as string;
        }
      } catch {
        return cleaned;
      }
    }
    
    return cleaned;
  };

  const handleVerify = async () => {
    const originalHex = normalizeInput(originalPubkey);
    const newHex = normalizeInput(newPubkey);
    
    if (!originalHex || !newHex) {
      toast({
        title: "Missing input",
        description: "Please enter both pubkeys",
        variant: "destructive",
      });
      return;
    }

    if (originalHex === newHex) {
      toast({
        title: "Same pubkey",
        description: "Please enter different pubkeys for comparison",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    // Update the state to trigger profile fetching
    setOriginalPubkey(originalHex);
    setNewPubkey(newHex);
    
    setTimeout(() => setIsVerifying(false), 2000);
  };

  const getStatusBadge = (isLoading: boolean, data: any, error: any) => {
    if (isLoading) {
      return <Badge variant="secondary">Loading...</Badge>;
    }
    if (error) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
    }
    if (data) {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Found</Badge>;
    }
    return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Not Found</Badge>;
  };

  const ProfileCard = ({ 
    title, 
    pubkey, 
    profile, 
    isLoading, 
    error 
  }: { 
    title: string;
    pubkey: string;
    profile: any;
    isLoading: boolean;
    error: any;
  }) => (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {getStatusBadge(isLoading, profile, error)}
        </div>
        <CardDescription className="font-mono text-xs break-all">
          {pubkey || 'No pubkey provided'}
          {pubkey && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2 h-4 w-4 p-0" 
              onClick={() => copyToClipboard(pubkey)}
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {profile ? (
          <div className="space-y-2">
            <div>
              <strong>Name:</strong> {JSON.parse(profile.content).name || 'N/A'}
            </div>
            {JSON.parse(profile.content).about && (
              <div>
                <strong>About:</strong> {JSON.parse(profile.content).about}
              </div>
            )}
            <div>
              <strong>Created:</strong> {new Date(profile.created_at * 1000).toLocaleString()}
            </div>
            <div>
              <strong>Event ID:</strong> 
              <code className="ml-2 text-xs">{profile.id.slice(0, 16)}...</code>
            </div>
          </div>
        ) : error ? (
          <div className="text-red-500">
            Failed to load profile: {error.message}
          </div>
        ) : pubkey && !isLoading ? (
          <div className="text-gray-500">
            No profile found for this pubkey
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const renderIsolationStatus = () => {
    if (!originalPubkey || !newPubkey || originalProfile.isLoading || newProfile.isLoading) {
      return null;
    }

    const issues: string[] = [];
    const successes: string[] = [];

    // Check if pubkeys are different
    if (originalPubkey === newPubkey) {
      issues.push("❌ CRITICAL: Same pubkey used for both accounts");
    } else {
      successes.push("✅ Different pubkeys");
    }

    // Check if both profiles exist
    if (originalProfile.data && newProfile.data) {
      // Check if profiles have different content
      try {
        const originalContent = JSON.parse(originalProfile.data.content);
        const newContent = JSON.parse(newProfile.data.content);
        
        if (originalContent.name === newContent.name) {
          issues.push("⚠️ WARNING: Profiles have the same name");
        } else {
          successes.push("✅ Profiles have different names");
        }

        // Check event IDs are different
        if (originalProfile.data.id === newProfile.data.id) {
          issues.push("❌ CRITICAL: Same event ID (impossible unless data corruption)");
        } else {
          successes.push("✅ Different event IDs");
        }

        // Check creation times
        if (Math.abs(originalProfile.data.created_at - newProfile.data.created_at) < 60) {
          issues.push("⚠️ INFO: Events created within 1 minute of each other");
        }

      } catch (error) {
        issues.push("⚠️ Could not parse profile content for comparison");
      }
    } else if (!originalProfile.data) {
      issues.push("⚠️ Original account profile not found");
    } else if (!newProfile.data) {
      issues.push("⚠️ New account profile not found");
    }

    const isIsolated = issues.filter(issue => issue.includes('CRITICAL')).length === 0;

    return (
      <Card className={`border-2 ${isIsolated ? 'border-green-500' : 'border-red-500'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isIsolated ? 'text-green-600' : 'text-red-600'}`}>
            {isIsolated ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            Isolation Status: {isIsolated ? 'PASSED' : 'FAILED'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {successes.map((success, idx) => (
            <div key={idx} className="text-green-600">{success}</div>
          ))}
          {issues.map((issue, idx) => (
            <div key={idx} className={
              issue.includes('CRITICAL') ? 'text-red-600' : 
              issue.includes('WARNING') ? 'text-yellow-600' : 
              'text-blue-600'
            }>
              {issue}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 Account Isolation Tester
          </CardTitle>
          <CardDescription>
            Verify that new account creation doesn't contaminate existing account profiles.
            Enter the pubkeys (hex or npub format) of the original and new accounts to test isolation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Original Account Pubkey
              </label>
              <Input
                placeholder="Enter hex pubkey or npub1..."
                value={originalPubkey}
                onChange={(e) => setOriginalPubkey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                New Account Pubkey
              </label>
              <Input
                placeholder="Enter hex pubkey or npub1..."
                value={newPubkey}
                onChange={(e) => setNewPubkey(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleVerify} 
            disabled={isVerifying}
            className="w-full"
          >
            {isVerifying ? 'Verifying...' : 'Verify Account Isolation'}
          </Button>
        </CardContent>
      </Card>

      {(originalPubkey || newPubkey) && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileCard
              title="Original Account Profile"
              pubkey={originalPubkey}
              profile={originalProfile.data}
              isLoading={originalProfile.isLoading}
              error={originalProfile.error}
            />
            <ProfileCard
              title="New Account Profile"
              pubkey={newPubkey}
              profile={newProfile.data}
              isLoading={newProfile.isLoading}
              error={newProfile.error}
            />
          </div>

          <Separator />

          {renderIsolationStatus()}
        </>
      )}

      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-sm">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>1. <strong>Before</strong> creating a new account: Copy your current account's pubkey</p>
          <p>2. Create a new account (e.g., "Unique Owl")</p>
          <p>3. Copy the new account's pubkey</p>
          <p>4. Paste both pubkeys above and click "Verify Account Isolation"</p>
          <p>5. Check the results - both accounts should have separate profiles</p>
          <p><strong>Expected Result:</strong> ✅ Each account maintains its own profile metadata</p>
          <p><strong>Failure Case:</strong> ❌ Creating "Unique Owl" overwrites original account's name</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AccountIsolationTester;
