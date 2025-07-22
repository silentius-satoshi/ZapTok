import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNIP60Cashu } from '@/hooks/useNIP60Cashu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const createWalletSchema = z.object({
  name: z.string().min(1, 'Wallet name is required').max(50, 'Name too long'),
  mintUrl: z.string().url('Please enter a valid mint URL'),
});

type CreateWalletForm = z.infer<typeof createWalletSchema>;

interface CreateCashuWalletModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCashuWalletModal({ open, onClose }: CreateCashuWalletModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createdWallet, setCreatedWallet] = useState<string | null>(null);
  const { createWallet } = useNIP60Cashu();
  const { toast } = useToast();

  const form = useForm<CreateWalletForm>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: {
      name: '',
      mintUrl: 'https://mint.minibits.cash/Bitcoin',
    },
  });

  const trustedMints = [
    {
      url: 'https://mint.minibits.cash/Bitcoin',
      name: 'Minibits',
      description: 'Popular and reliable Cashu mint',
    },
    {
      url: 'https://mint.coinos.io',
      name: 'Coinos', 
      description: 'Established Bitcoin services provider',
    },
    {
      url: 'https://cashu.me',
      name: 'Cashu.me',
      description: 'Official Cashu development mint',
    },
    {
      url: 'https://stablenut.umint.cash',
      name: 'Stablenut',
      description: 'Multi-unit Cashu mint',
    },
  ];

  const onSubmit = async (data: CreateWalletForm) => {
    try {
      setIsCreating(true);
      
      // Create the wallet using the NIP-60 Cashu hook
      // Note: NIP-60 createWallet expects array of mint URLs
      const walletId = await createWallet([data.mintUrl]);

      setCreatedWallet(walletId);
      toast({
        title: "Wallet Created",
        description: "Your Cashu wallet has been created successfully!",
      });
      
      // Reset form for next use
      form.reset();
    } catch (error) {
      console.error('Failed to create Cashu wallet:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create Cashu wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setCreatedWallet(null);
    form.reset();
    onClose();
  };

  if (createdWallet) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Wallet Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Your Cashu wallet has been created and encrypted backup stored to Nostr.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Wallet Ready</h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {createdWallet.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    Wallet Synced to Nostr
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 mt-1">
                    Your wallet data is encrypted and backed up to your Nostr relays. 
                    It will sync across all your devices.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Cashu Wallet</DialogTitle>
          <DialogDescription>
            Create a new eCash wallet that syncs across your devices via Nostr.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Cashu Wallet"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this wallet.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mintUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cashu Mint</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trusted mint" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trustedMints.map((mint) => (
                        <SelectItem key={mint.url} value={mint.url}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{mint.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {mint.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a trusted Cashu mint for your wallet.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-300">
                    Important
                  </p>
                  <p className="text-yellow-600 dark:text-yellow-400 mt-1">
                    Only use trusted mints. Your eCash tokens are only as reliable as the mint that issued them.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Wallet
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
