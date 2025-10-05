import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useIsMobile } from '@/hooks/useIsMobile';

export function FAQ() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useSeoMeta({
    title: 'Frequently Asked Questions - ZapTok',
    description: 'Find answers to common questions about ZapTok, the decentralized video platform built on Nostr with instant Bitcoin payments.',
  });

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="h-screen">
        <div className="flex h-full">
          {/* Left Sidebar - Logo and Navigation - Hidden on Mobile */}
          {!isMobile && (
            <div className="flex flex-col bg-black">
              <LogoHeader />
              <div className="flex-1">
                <Navigation />
              </div>
            </div>
          )}

            {/* FAQ Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="max-w-4xl mx-auto p-6">
                {/* Back Button */}
                <Button variant="ghost" className="mb-4" onClick={handleGoBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                <div className="space-y-8">
                  {/* FAQ Section */}
                  <Card className="border-0 shadow-none bg-transparent">
                    <CardContent className="p-8 px-0">
                      <div className="space-y-6">
                        <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>

                        <div className="space-y-8">
                          {/* For Creators */}
                          <div className="space-y-3">
                            <h2 className="text-xl font-semibold" style={{
                              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}>For Creators</h2>
                            
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="creators-earnings" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">How do I keep my earnings?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  Keep 100% of your earnings. ZapTok takes zero platform fees. Receive instant Bitcoin tips (lightning zaps) directly to your wallet with no intermediaries or chargebacks.
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="creators-content" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">What happens to my content and followers?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  You own your identity and follower relationships through Nostr. No platform can delete you or your content. Build once, publish everywhere - your content works across all Nostr apps.
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="creators-global" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">Can I earn from a global audience?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  Yes! Get paid 24/7 from anywhere in the world without banking restrictions. Bitcoin transcends borders, enabling you to monetize your content globally.
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>

                          {/* For Viewers */}
                          <div className="space-y-3">
                            <h2 className="text-xl font-semibold" style={{
                              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}>For Viewers</h2>
                            
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="viewers-privacy" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">Is my privacy protected?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  Absolutely. Watch and interact without giving up personal data. Your viewing history and preferences stay private by design. Tip creators with pseudo-anonymous Bitcoin zap payments.
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="viewers-identity" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">Can I use the same identity across other apps?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  Yes! Your Nostr identity works across all Nostr-compatible apps. One identity, infinite possibilities - use it on ZapTok, Damus, Primal, Amethyst, and more.
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="viewers-censorship" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">What about censorship?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  Access content that can't be censored or geo-blocked. The decentralized architecture means no single entity controls what you can see or share.
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>

                          {/* For Everyone */}
                          <div className="space-y-3">
                            <h2 className="text-xl font-semibold" style={{
                              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}>For Everyone</h2>
                            
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="everyone-security" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">How secure and transparent is ZapTok?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  ZapTok is{' '}
                                  <a 
                                    href="https://github.com/silentius-satoshi/ZapTok" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    open source
                                  </a>
                                  {' '}- you can verify security and suggest improvements. No single company can shut down the network or your Nostr account. Real-time interactions without corporate algorithms deciding what you see.
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="everyone-global" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">Does ZapTok work globally?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  Yes! ZapTok works the same way everywhere with internet access. Your posts and social connections are portable between platforms.
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="everyone-started" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">How do I get started?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  Simply log in with a Nostr browser extension (like{' '}
                                  <a 
                                    href="https://getalby.com/auth/users/new" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Alby
                                  </a>
                                  {' '}or{' '}
                                  <a 
                                    href="https://github.com/fiatjaf/nos2x?tab=readme-ov-file" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    nos2x
                                  </a>
                                  ), use a remote signer (like{' '}
                                  <a 
                                    href="https://use.nsec.app/home" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    nsec.app
                                  </a>
                                  ), or{' '}
                                  <a 
                                    href="https://nstart.me/en" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    create a new identity
                                  </a>
                                  . Connect your Lightning wallet to send and receive zaps instantly.
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}
