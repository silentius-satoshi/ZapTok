import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { AuthGate } from '@/components/AuthGate';
import { LoginArea } from '@/components/auth/LoginArea';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';

export function About() {
  const navigate = useNavigate();

  useSeoMeta({
    title: 'About ZapTok',
    description: 'Learn about ZapTok, the decentralized video platform built on the Nostr protocol. Discover how we\'re revolutionizing social media with censorship-resistant, peer-to-peer video sharing.',
  });

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <AuthGate>
      <div className="min-h-screen bg-black text-white">
        <main className="h-screen">
          <div className="flex h-full">
            {/* Left Sidebar - Logo and Navigation */}
            <div className="flex flex-col bg-black">
              <LogoHeader />
              <div className="flex-1">
                <Navigation />
              </div>
            </div>

            {/* About Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="max-w-4xl mx-auto p-6">
                {/* Back Button */}
                <Button variant="ghost" className="mb-4" onClick={handleGoBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                <div className="space-y-8">

          {/* About ZapTok Section */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-8 px-0">
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-4">About ZapTok</h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    ZapTok is an{' '}
                    <a 
                      href="https://github.com/silentius-satoshi/ZapTok/tree/main" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      open source
                    </a>
                    , decentralized short-form video platform where instant Bitcoin meets endless swipeable content — enabling direct creator monetization through value-for-value on Nostr.
                  </p>
                </div>

                <div className="space-y-4 text-muted-foreground">
                  <p>
                    We deliver censorship-resistant content sharing with lightning-fast Bitcoin tips (aka zaps), giving creators and users complete control over their data and earnings. Experience familiar social media with true ownership and privacy — where your content and earnings are actually yours.
                  </p>

                  <p className="text-lg font-medium text-foreground">
                    You keep 100% of your earnings. No percentage of your earnings is distributed to the platform.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-8 px-0">
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>

                <div className="space-y-8">
                  {/* For Creators */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-primary">For Creators</h3>
                    
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
                    <h3 className="text-xl font-semibold text-primary">For Viewers</h3>
                    
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
                    <h3 className="text-xl font-semibold text-primary">For Everyone</h3>
                    
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

          {/* Support ZapTok */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-8 px-0">
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Support ZapTok</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Help us continue building and improving ZapTok. Your support enables us to maintain the platform,
                    add new features, and keep the community growing.
                  </p>

                  <div className="flex flex-col items-center space-y-8 pt-4">
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                      {/* Nostr Profile QR */}
                      <div className="flex flex-col items-center space-y-4">
                        <a 
                          href="https://njump.me/npub187ffdcqg4k56x2x3wmtlu6wkawuzm5k5wvzj980p0uvx3ek6tg7svrdkx8"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                          title="Click to view ZapTok's Nostr profile"
                        >
                          <div className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <img
                              src={`${import.meta.env.BASE_URL}images/qr-npub.png`}
                              alt="Nostr Profile QR Code"
                              className="w-48 h-48 object-contain border"
                              onError={(e) => {
                                console.error('Nostr QR image failed to load. Attempted URL:', e.currentTarget.src);
                                console.error('Base URL:', import.meta.env.BASE_URL);
                              }}
                              onLoad={() => console.log('Nostr QR image loaded successfully')}
                            />
                          </div>
                        </a>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium">Follow us on nostr</p>
                          <p className="text-xs text-muted-foreground break-all">
                            <a 
                              href="https://njump.me/npub187ffdcqg4k56x2x3wmtlu6wkawuzm5k5wvzj980p0uvx3ek6tg7svrdkx8"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              npub187ffdcqg4k56x2x3wmtlu6wkawuzm5k5wvzj980p0uvx3ek6tg7svrdkx8
                            </a>
                          </p>
                        </div>
                      </div>

                      {/* Lightning QR */}
                      <div className="flex flex-col items-center space-y-4">
                        <a 
                          href="lightning:zaptok@strike.me"
                          className="cursor-pointer"
                          title="Click to open in your Lightning wallet"
                        >
                          <div className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <img
                              src={`${import.meta.env.BASE_URL}images/qr-lightning.png`}
                              alt="Lightning Address QR Code"
                              className="w-48 h-48 object-contain border"
                              onError={(e) => {
                                console.error('Lightning QR image failed to load. Attempted URL:', e.currentTarget.src);
                                console.error('Base URL:', import.meta.env.BASE_URL);
                              }}
                              onLoad={() => console.log('Lightning QR image loaded successfully')}
                            />
                          </div>
                        </a>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium">Zap to show your support for ZapTok development</p>
                          <p className="text-xs text-muted-foreground">
                            <a 
                              href="lightning:zaptok@strike.me"
                              className="text-primary hover:underline"
                            >
                              zaptok@strike.me
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Talk to us */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-8 px-0">
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Talk to us</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Love ZapTok? Have an idea for how to make it better? Come say hello in our community or visit our
                    GitHub. We welcome your feedback, ideas, contributions, and bug reports.
                  </p>

                  <div className="pt-4">
                    <Tabs defaultValue="soapbox" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger
                          value="soapbox"
                          onClick={() => window.open('https://soapbox.pub/mkstack', '_blank')}
                        >
                          Soapbox Communities
                        </TabsTrigger>
                        <TabsTrigger
                          value="chorus"
                          onClick={() => window.open('https://chorus.community/group/34550%3A8b12bddc423189c660156eab1ea04e1d44cc6621c550c313686705f704dda895%3Azaptok-mdgpgdbb', '_blank')}
                        >
                          ZapTok on +Chorus
                        </TabsTrigger>
                        <TabsTrigger
                          value="github"
                          onClick={() => window.open('https://github.com/silentius-satoshi/ZapTok/tree/main', '_blank')}
                        >
                          GitHub
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer attribution */}
          <div className="text-center py-8">
            <a
              href="https://github.com/silentius-satoshi/ZapTok/tree/main"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              v{__APP_VERSION__} ({__GIT_COMMIT__})
            </a>
          </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Compact Login Area */}
            <div className="hidden lg:block w-96 overflow-visible relative">
              <div className="sticky top-4 space-y-6 overflow-visible">
                {/* Login Area */}
                <div className="p-3 overflow-visible relative">
                  <LoginArea className="justify-end max-w-full" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}

export default About;
