import { WalletConnect } from '@/components/WalletConnect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoginArea } from '@/components/auth/LoginArea';

export function Settings() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and wallet settings</p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginArea className="max-w-60" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lightning Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <WalletConnect />
        </CardContent>
      </Card>
    </div>
  );
}
