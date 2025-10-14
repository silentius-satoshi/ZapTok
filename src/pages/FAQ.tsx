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
import { VideoUploadModal } from '@/components/VideoUploadModal';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function FAQ() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
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
                        <p className="text-muted-foreground mb-6">
                          Everything you need to know about using ZapTok, managing your account, and staying secure on Nostr.
                        </p>

                        <div className="space-y-8">
                          {/* Getting Started & Login */}
                          <div className="space-y-3">
                            <h2 className="text-xl font-semibold" style={{
                              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}>🚀 Getting Started & Login</h2>
                            
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="started-newuser" className="border-b border-border/40">
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

                              <AccordionItem value="started-upload" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">How do I upload and share videos?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <div className="space-y-3">
                                    {user ? (
                                      <div className="mb-3">
                                        <Button 
                                          onClick={() => setShowUploadModal(true)}
                                          className="w-full sm:w-auto"
                                        >
                                          Upload a Video Now
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="mb-3 p-3 bg-muted rounded-md">
                                        <p className="text-sm">
                                          <button
                                            onClick={() => setShowLoginModal(true)}
                                            className="text-primary hover:underline font-semibold"
                                          >
                                            Log in
                                          </button>
                                          {' '}to start uploading videos!
                                        </p>
                                      </div>
                                    )}

                                    <p><strong>Quick steps to upload:</strong></p>
                                    <ol className="list-decimal pl-5 space-y-2">
                                      <li>Log in with your Nostr identity</li>
                                      <li>Click the <strong>Upload</strong> button (+ icon) in the navigation or use the button above</li>
                                      <li>Select your video file from your device</li>
                                      <li>Add a title and optional description</li>
                                      <li>Click <strong>Publish</strong> - your video goes live instantly!</li>
                                    </ol>

                                    <p className="pt-2"><strong>Supported formats:</strong></p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Formats: MP4, WebM, MOV</li>
                                      <li>Recommended resolution: 1080p or lower</li>
                                      <li>Aspect ratio: Vertical (9:16) or horizontal (16:9)</li>
                                    </ul>

                                    <p className="pt-2">
                                      Videos are stored using <strong>Blossom servers</strong> - a decentralized file storage protocol for Nostr. Your content remains accessible even if ZapTok goes offline, and appears in feeds across all Nostr video apps.
                                    </p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="started-safest" className="border-b border-border/40">
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
                                      <li>Android users: Use{' '}
                                        <a 
                                          href="https://github.com/greenart7c3/Amber" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          Amber
                                        </a>
                                        {' '}app (works as both extension and remote signer via bunker://)
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
                            </Accordion>
                          </div>
                          {/* Payments & Wallets */}
                          <div className="space-y-3">
                            <h2 className="text-xl font-semibold" style={{
                              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}>💸 Payments & Wallets</h2>
                            
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="payments-setup" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">How do I set up my wallet to receive zaps?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <div className="space-y-3">
                                    <p><strong>Step-by-step:</strong></p>
                                    <ol className="list-decimal pl-5 space-y-2">
                                      <li>Choose a Lightning wallet:{' '}
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
                                          href="https://strike.me/bitcoin/" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          Strike
                                        </a>
                                        ,{' '}
                                        <a 
                                          href="https://phoenix.acinq.co/" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          Phoenix
                                        </a>
                                        ,{' '}
                                        <a 
                                          href="https://www.walletofsatoshi.com/" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          Wallet of Satoshi
                                        </a>
                                        , or any NWC-compatible wallet
                                      </li>
                                      <li>Get your Lightning address (e.g., yourname@getalby.com)</li>
                                      <li>Add it to your Nostr profile in the Edit Profile section</li>
                                      <li>Start receiving instant zaps when viewers tip your videos!</li>
                                    </ol>

                                    <p className="pt-2">
                                      <strong>What is NWC?</strong> Nostr Wallet Connect (NWC) allows you to connect your Lightning wallet to Nostr apps securely. Most modern Lightning wallets support this feature, enabling seamless zap payments without exposing your wallet credentials.
                                    </p>

                                    <p className="pt-2">No approval process, no minimum payout threshold, no waiting periods. Payments arrive in seconds.</p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="payments-extensions" className="border-b border-border/40">
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
                                      {'), '}
                                      <a 
                                        href="https://github.com/greenart7c3/Amber" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        Amber
                                      </a>
                                      {' (Android)'}):
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Store keys locally in your browser or device</li>
                                      <li>Good for desktop use (Alby, nos2x) or mobile (Amber)</li>
                                      <li>Work only on the device where installed</li>
                                      <li>Amber can also work as a remote signer via bunker:// for PWA usage</li>
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

                              <AccordionItem value="payments-cashu" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">What is Cashu and how does it work with ZapTok?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <div className="space-y-3">
                                    <p>
                                      Cashu is an open-source Chaumian eCash protocol built for Bitcoin. It brings the privacy and simplicity of physical cash to digital payments. ZapTok integrates Cashu for private, peer-to-peer tipping through "nutzaps".
                                    </p>
                                    
                                    <p><strong>Key Benefits:</strong></p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li><strong>Enhanced Privacy:</strong> Blind signatures preserve user privacy - more private than standard Lightning zaps</li>
                                      <li><strong>Instant & Final:</strong> Transactions are instant and final, just like physical cash</li>
                                      <li><strong>Bearer Token:</strong> Stored on your device, no accounts or databases tracking your activity</li>
                                      <li><strong>Built-in Wallet:</strong> Access your{' '}
                                        <a 
                                          href="/#/cashu-wallet" 
                                          className="text-primary hover:underline"
                                        >
                                          Cashu wallet
                                        </a>
                                        {' '}directly in ZapTok
                                      </li>
                                      <li><strong>Easy to Use:</strong> Works seamlessly alongside Lightning payments</li>
                                    </ul>

                                    <p className="pt-2">
                                      Want to try Cashu?{' '}
                                      <a 
                                        href="https://wallet.cashu.me/welcome" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        Get started with the Cashu web wallet
                                      </a>
                                      {' '}or{' '}
                                      <a 
                                        href="https://cashu.space/" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        learn more about how it works
                                      </a>
                                      . You can receive both Lightning zaps and Cashu nutzaps - set up both wallet types to give your supporters multiple payment options!
                                    </p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="payments-which-wallet" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">Should I use Lightning, Cashu, or both?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <div className="space-y-3">
                                    <p><strong>We recommend setting up both!</strong></p>
                                    
                                    <p><strong>Lightning Wallet</strong> - Best for:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Receiving larger tips and payments</li>
                                      <li>Compatibility with all Bitcoin/Lightning services</li>
                                      <li>Direct connection to your existing Bitcoin infrastructure</li>
                                    </ul>
                                    
                                    <p><strong>Cashu Wallet</strong> - Best for:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Enhanced privacy for peer-to-peer tips</li>
                                      <li>Quick, small-value payments</li>
                                      <li>Users who prioritize anonymity</li>
                                    </ul>

                                    <p className="pt-2"><strong>Recommended setup order for new users:</strong></p>
                                    <ol className="list-decimal pl-5 space-y-1">
                                      <li>Start with <strong>Lightning</strong> (easier to set up, more widely supported)</li>
                                      <li>Add <strong>Cashu</strong> later when you want enhanced privacy features</li>
                                      <li>Both wallets work independently with no conflicts</li>
                                    </ol>

                                    <p className="pt-2">
                                      Having both gives your supporters flexibility. They can choose which payment method works best for them, and you maximize your earning potential!
                                    </p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="payments-nutzaps" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">What are nutzaps and how do they work?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <div className="space-y-3">
                                    <p>
                                      Nutzaps are private Bitcoin tips powered by Cashu eCash. They combine the social aspect of zaps with the enhanced privacy of Cashu tokens.
                                    </p>
                                    
                                    <p><strong>How Nutzaps Work:</strong></p>
                                    <ol className="list-decimal pl-5 space-y-2">
                                      <li>Sender uses Cashu tokens from their wallet</li>
                                      <li>Tokens are sent as a Nostr event (kind 9321) with a zap message</li>
                                      <li>Recipient automatically receives the Cashu tokens in their wallet</li>
                                      <li>Tokens can be spent, saved, or redeemed for Bitcoin</li>
                                    </ol>

                                    <p><strong>Privacy Advantages:</strong></p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li><strong>No Lightning Invoice:</strong> No need to generate invoices or expose Lightning node information</li>
                                      <li><strong>Peer-to-Peer:</strong> Direct transfers between users without intermediate routing</li>
                                      <li><strong>Blind Signatures:</strong> The mint can't link sender to receiver</li>
                                      <li><strong>No Blockchain Trail:</strong> Cashu transactions don't appear on the Bitcoin blockchain</li>
                                    </ul>

                                    <p className="pt-2">
                                      Nutzaps are perfect for content creators who value privacy and want to offer their supporters an anonymous way to show appreciation. Set up your{' '}
                                      <a 
                                        href="/#/cashu-wallet" 
                                        className="text-primary hover:underline"
                                      >
                                        Cashu wallet
                                      </a>
                                      {' '}in ZapTok to start receiving nutzaps today!
                                    </p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                          <div className="space-y-3">
                            <h2 className="text-xl font-semibold" style={{
                              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}>🎬 For Creators</h2>
                            
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="creators-earnings" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">How do I keep my earnings?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  Zaps are sent directly to YOUR{' '}
                                  <a 
                                    href="/#/bitcoin-connect-wallet" 
                                    className="text-primary hover:underline"
                                  >
                                    Lightning
                                  </a>
                                  {' '}or{' '}
                                  <a 
                                    href="/#/cashu-wallet" 
                                    className="text-primary hover:underline"
                                  >
                                    Cashu
                                  </a>
                                  {' '}wallet address. ZapTok never holds your funds—payments go straight from the sender to your wallet in seconds. You control the keys, you control the money. There's no platform custody, no withdrawal requests, and no waiting periods. Just pure peer-to-peer payments with zero fees deducted.
                                  <br /><br />
                                  <strong>Want to convert to on-chain Bitcoin?</strong> Use{' '}
                                  <a 
                                    href="https://boltz.exchange" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Boltz.exchange
                                  </a>
                                  {' '}for non-custodial atomic swaps to your Bitcoin wallet, or custodial services like{' '}
                                  <a 
                                    href="https://strike.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Strike
                                  </a>
                                  {' '}or{' '}
                                  <a 
                                    href="https://bitcoinwell.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Bitcoin Well
                                  </a>
                                  {' '}that handle the conversion for you.
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
                            }}>👀 For Viewers</h2>
                            
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
                                  <div className="space-y-3">
                                    <p>
                                      Content on Nostr is censorship-resistant, but not censorship-proof. Understanding the difference is important:
                                    </p>

                                    <p><strong>What CAN'T be censored:</strong></p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li><strong>Your account/identity</strong> - You own your keys, no one can ban you</li>
                                      <li><strong>Your social connections</strong> - Your follower/following lists persist</li>
                                      <li><strong>Content across the network</strong> - Distributed across multiple independent relays</li>
                                    </ul>

                                    <p><strong>What CAN happen:</strong></p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li>Individual relays may remove or refuse to host certain content</li>
                                      <li>ZapTok.social or other clients may filter what they display</li>
                                      <li>Your chosen relay may have its own content policies</li>
                                    </ul>

                                    <p className="pt-2">
                                      <strong>Your freedom:</strong> You can always switch relays or use other Nostr clients to access all content, regardless of any single platform's policies. No single company controls the entire network.
                                    </p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>

                          {/* Platform & Technology */}
                          <div className="space-y-3">
                            <h2 className="text-xl font-semibold" style={{
                              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}>🔧 Platform & Technology</h2>
                            
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
                                  <div className="space-y-3">
                                    <p>
                                      Yes! ZapTok works globally with just internet access. The decentralized nature provides several advantages:
                                    </p>

                                    <ul className="list-disc pl-5 space-y-1">
                                      <li><strong>No geographic restrictions</strong> - No geo-blocking of content</li>
                                      <li><strong>Bitcoin payments work across all borders</strong> - No banking restrictions or currency conversion</li>
                                      <li><strong>Content accessible from any country</strong> - Your posts reach a global audience</li>
                                      <li><strong>No regional licensing issues</strong> - You control and own your content</li>
                                      <li><strong>Your identity works everywhere</strong> - Same account on all Nostr apps worldwide</li>
                                    </ul>

                                    <p className="pt-2">
                                      <strong>Note:</strong> Local internet censorship may affect relay access in some regions. If this happens, you can configure alternative relays in settings to ensure continued access.
                                    </p>
                                  </div>
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
                                  <div className="space-y-3">
                                    <p>
                                      Your private key (nsec) is like the master password to your Nostr identity. It controls your account, content, and social connections. Unlike traditional platforms, YOU own it, not ZapTok. Anyone with your private key has full control of your account - they can post as you, delete content, and access everything.
                                    </p>

                                    <p><strong>Think of it like this:</strong></p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      <li><strong>Your PUBLIC key (npub)</strong> = your username/email address (safe to share with everyone)</li>
                                      <li><strong>Your PRIVATE key (nsec)</strong> = your master password (NEVER share with anyone)</li>
                                    </ul>

                                    <p className="pt-2">
                                      Your npub is how people find and follow you. Your nsec is what proves you're actually you when posting and signing events.
                                    </p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="security-keepsafe" className="border-b border-border/40">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  <span className="font-medium text-foreground">How do I keep my private key safe?</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  <div className="space-y-3">
                                    <p><strong>Essential Security Rules:</strong></p>
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
                                        ) instead of pasting keys directly into websites
                                      </li>
                                      <li>Don't screenshot or share it with others - especially to those who personally ask for it. <strong className="text-destructive">Beware of scammers!</strong></li>
                                      <li>Treat it like your bank password - it can't be reset if lost</li>
                                    </ul>

                                    <p className="pt-2"><strong>Backup Your Key Securely (choose one or both):</strong></p>
                                    <ul className="list-disc pl-5 space-y-2">
                                      <li><strong>Physical backup (most secure):</strong> Write your private key on paper and store in a safe physical location (fireproof safe, safety deposit box)</li>
                                      <li><strong>Digital backup:</strong> Use a secure password manager like{' '}
                                        <a 
                                          href="https://proton.me/pass" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          Proton Pass
                                        </a>
                                        ,{' '}
                                        <a 
                                          href="https://bitwarden.com" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          Bitwarden
                                        </a>
                                        , or offline manager like{' '}
                                        <a 
                                          href="https://keepassxc.org" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          KeePassXC
                                        </a>
                                      </li>
                                      <li><strong>Best practice:</strong> Use BOTH methods for redundancy</li>
                                    </ul>
                                  </div>
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

      <VideoUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </>
  );
}
