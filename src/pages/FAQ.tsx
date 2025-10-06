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
import { useState } from 'react';
import { LoginModal } from '@/components/auth/LoginModal';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function FAQ() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user } = useCurrentUser();

  useSeoMeta({
    title: 'Frequently Asked Questions - ZapTok',
    description: 'Find answers to common questions about ZapTok, the decentralized video platform built on Nostr with instant Bitcoin payments.',
  });

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <>
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
                                  Keep 100% of your earnings. ZapTok takes zero platform fees. Receive instant Bitcoin tips (lightning zaps) directly to your{' '}
                                  <a 
                                    href="/#/cashu-wallet" 
                                    className="text-primary hover:underline"
                                  >
                                    cashu
                                  </a>
                                  {' '}and/or{' '}
                                  <a 
                                    href="/#/bitcoin-connect-wallet" 
                                    className="text-primary hover:underline"
                                  >
                                    lightning
                                  </a>
                                  {' '}wallet with no intermediaries or chargebacks.
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
                                  Yes! Your Nostr identity works across all Nostr-compatible apps. One identity, infinite possibilities - use it on ZapTok,{' '}
                                  <a 
                                    href="https://www.amethyst.social/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Amethyst
                                  </a>
                                  ,{' '}
                                  <a 
                                    href="https://coracle.social/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Coracle
                                  </a>
                                  ,{' '}
                                  <a 
                                    href="https://damus.io/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Damus
                                  </a>
                                  ,{' '}
                                  <a 
                                    href="https://jumble.social/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Jumble
                                  </a>
                                  ,{' '}
                                  <a 
                                    href="https://phoenix.social/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Phoenix
                                  </a>
                                  ,{' '}
                                  <a 
                                    href="https://plebs.app/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Plebs
                                  </a>
                                  ,{' '}
                                  <a 
                                    href="https://primal.net/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Primal
                                  </a>
                                  ,{' '}
                                  <a 
                                    href="https://yakihonne.com/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Yakihonne
                                  </a>
                                  ,{' '}
                                  <a 
                                    href="https://zap.stream/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Zap.stream
                                  </a>
                                  , and{' '}
                                  <a 
                                    href="https://nostrapps.com/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    more
                                  </a>
                                  .
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
                                    href="https://getalby.com/alby-extension" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Alby
                                  </a>
                                  {' '}or{' '}
                                  <a 
                                    href="https://github.com/fiatjaf/nos2x" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    nos2x
                                  </a>
                                  {' ('}
                                  <a 
                                    href="https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    chrome extension
                                  </a>
                                  {')'}), use a remote signer (like{' '}
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

                          {/* Account & Security */}
                          <div className="space-y-3">
                            <h2 className="text-xl font-semibold" style={{
                              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}>🔑 Account & Security</h2>
                            
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="security-privatekey" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">What is a Nostr private key and why is it important?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  Your private key (nsec) is like the master password to your Nostr identity. It controls your account, content, and social connections. Unlike traditional platforms, YOU own it, not ZapTok. Anyone with your private key has full control of your account - they can post as you, delete content, and access everything.
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="security-keepsafe" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">How do I keep my private key safe?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Never share your nsec/private key</strong> with anyone</li>
                                    <li>Use a browser extension ({' '}
                                      <a 
                                        href="https://getalby.com/alby-extension" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        Alby
                                      </a>
                                      ,{' '}
                                      <a 
                                        href="https://github.com/fiatjaf/nos2x" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        nos2x
                                      </a>
                                      {' ('}
                                      <a 
                                        href="https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        chrome
                                      </a>
                                      {')'}) or remote signer ({' '}
                                      <a 
                                        href="https://nsec.app" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        nsec.app
                                      </a>
                                      ) instead of pasting keys directly into websites</li>
                                    <li>Write down your private key on paper and store it securely in a secure password manager such as{' '}
                                      <a 
                                        href="https://proton.me/pass" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        Proton Pass
                                      </a>
                                      {' '}and{' '}
                                      <a 
                                        href="https://bitwarden.com" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        Bitwarden
                                      </a>
                                      {' '}or an offline password manager like{' '}
                                      <a 
                                        href="https://keepassxc.org" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        KeePassXC
                                      </a>
                                    </li>
                                    <li>Don't screenshot and share it with others - especially to those who personally ask for it. <strong className="text-destructive">Beware of scammers!</strong></li>
                                    <li>Treat it like your bank password - it can't be reset if lost</li>
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="security-extensions" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">What's the difference between browser extensions and remote signers?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <div className="space-y-3">
                                    <p><strong>Browser Extensions</strong> ({' '}
                                      <a 
                                        href="https://getalby.com/alby-extension" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        Alby
                                      </a>
                                      , {' '}
                                      <a 
                                        href="https://github.com/fiatjaf/nos2x" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        nos2x
                                      </a>
                                      {' ('}
                                      <a 
                                        href="https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        chrome
                                      </a>
                                      {')'}):
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Store keys locally in your browser</li>
                                      <li>Good for desktop use</li>
                                      <li>Work only on the device where installed</li>
                                    </ul>
                                    
                                    <p><strong>Remote Signers</strong> ({' '}
                                      <a 
                                        href="https://nsec.app" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        nsec.app
                                      </a>
                                      , {' '}
                                      <a 
                                        href="https://nostrapps.com/amber" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        Amber
                                      </a>
                                      ):
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Store keys on a separate device or secure service</li>
                                      <li>Accessible from anywhere</li>
                                      <li>Recommended for mobile and multi-device use</li>
                                    </ul>
                                    
                                    <p className="pt-2">Both are safer than pasting raw keys into websites. Remote signers are recommended for beginners and mobile users.</p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="security-lostkey" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">What happens if I lose my private key?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <p className="font-semibold text-destructive mb-2">⚠️ Your account cannot be recovered.</p>
                                  <ul className="list-disc pl-5 space-y-2">
                                    <li>Nostr has no password reset - this is by design</li>
                                    <li>You'll lose access to your identity, followers, and content forever</li>
                                    <li>You'll need to create a completely new account and rebuild your following</li>
                                    <li>This is the tradeoff for self-sovereignty - you're in control, but also responsible</li>
                                    <li><strong>Backup your key immediately</strong> after creating an account!</li>
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="security-recovery" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">Can ZapTok reset my password or recover my account?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <p className="mb-2"><strong>No.</strong> ZapTok doesn't store your private keys and cannot recover them.</p>
                                  <p className="mb-2">This is a <strong>feature, not a bug</strong>:</p>
                                  <ul className="list-disc pl-5 space-y-2">
                                    <li>True ownership means true responsibility</li>
                                    <li>No company can lock you out of your account</li>
                                    <li>No government can seize your identity</li>
                                    <li>But you must protect your own keys - there's no customer support that can help if you lose them</li>
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="security-safest" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">What's the safest way to use ZapTok?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <div className="space-y-3">
                                    <p><strong>For Desktop:</strong></p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Use{' '}
                                        <a 
                                          href="https://getalby.com/alby-extension" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          Alby
                                        </a>
                                        {' '}or{' '}
                                        <a 
                                          href="https://github.com/fiatjaf/nos2x" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          nos2x
                                        </a>
                                        {' ('}
                                        <a 
                                          href="https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          chrome extension
                                        </a>
                                        {')'}
                                      </li>
                                      <li>Never paste your private key directly into ZapTok</li>
                                    </ul>
                                    
                                    <p><strong>For Mobile & Multi-Device:</strong></p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Use{' '}
                                        <a 
                                          href="https://nsec.app" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          nsec.app
                                        </a>
                                        {' '}remote signer (recommended for beginners)
                                      </li>
                                      <li>Works across all devices with QR code login</li>
                                    </ul>
                                    
                                    <p><strong>Best Practices:</strong></p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Create a backup before connecting a Lightning wallet</li>
                                      <li>Test with small zaps before receiving large amounts</li>
                                      <li>Consider using a separate key for testing</li>
                                    </ul>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="security-newuser" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">I'm new to this - what should I do first?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <div className="space-y-3">
                                    <p><strong>Step-by-step for beginners:</strong></p>
                                    <ol className="list-decimal pl-5 space-y-2">
                                      <li>
                                        <strong>Choose a login method:</strong>
                                        <ul className="list-disc pl-5 mt-1">
                                          <li>Easiest:{' '}
                                            <a 
                                              href="https://nsec.app" 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline"
                                            >
                                              nsec.app
                                            </a>
                                            {' '}(works on all devices)
                                          </li>
                                          <li>Desktop:{' '}
                                            <a 
                                              href="https://getalby.com/alby-extension" 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline"
                                            >
                                              Alby extension
                                            </a>
                                          </li>
                                          <li>Quick start:{' '}
                                            <a 
                                              href="https://nstart.me/en" 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline"
                                            >
                                              Create new identity
                                            </a>
                                          </li>
                                        </ul>
                                      </li>
                                      <li><strong className="text-destructive">Save your backup phrase/private key in a safe place BEFORE doing anything else</strong></li>
                                      <li>Explore read-only mode first to understand how ZapTok works</li>
                                      <li>
                                        {user ? (
                                          <>Already logged in? You're all set! Start exploring and create content with your profile.</>
                                        ) : (
                                          <>
                                            When you are ready to join Nostr,{' '}
                                            <button
                                              onClick={() => setShowLoginModal(true)}
                                              className="text-primary hover:underline font-semibold"
                                            >
                                              get started
                                            </button>
                                            {' '}with your new profile!
                                          </>
                                        )}
                                      </li>
                                      <li>Connect your Lightning wallet to send and receive zaps</li>
                                      <li>Test with small zaps (10-100 sats) before larger amounts</li>
                                      <li>Start creating and sharing content!</li>
                                    </ol>
                                  </div>
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

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
