import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { AuthGate } from '@/components/AuthGate';
import { LoginArea } from '@/components/auth/LoginArea';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';

export function About() {
  const navigate = useNavigate();

  useSeoMeta({
    title: 'About ZapTok - Nostr Video Platform',
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
                    ZapTok is an open-sourced, decentralized video platform powered by Bitcoin — built using the
                    MKStack platform framework on the open Nostr protocol.
                  </p>
                </div>

                <div className="space-y-4 text-muted-foreground">
                  <p>
                    We deliver censorship-resistant content sharing with lightning-fast Bitcoin tips (aka zaps), giving creators and users complete control over their data and earnings. Experience familiar social media with true ownership and privacy - where your content and earnings are actually yours.
                  </p>

                  <p className="text-lg font-medium text-foreground">
                    Keep 100% of your earnings. No percentage of your earnings is distributed to the platform.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What can you do with ZapTok? */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-8 px-0">
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">What can you do with ZapTok?</h2>

                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Create your own content and set the tone for your community</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Create and upload videos — share your updates, reflections, or inspiration</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Join conversations in public communities that align with your interests</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Stay anonymous or show up with intention — use a pseudonym, stay private, or bring your existing Nostr identity</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Use it on the go — fast, lightweight, and mobile-ready</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Support creators & fund projects through Bitcoin Lightning zaps and eCash micropayments via the Cashu protocol</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Receive support for your own work, creativity, or ideas from a like-minded community</span>
                  </li>
                </ul>
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
                        <div className="bg-white p-4 rounded-lg shadow-lg">
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
                        <div className="bg-white p-4 rounded-lg shadow-lg">
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
                          disabled
                          className="opacity-50 cursor-not-allowed"
                          title="Repository will be public soon"
                        >
                          GitHub (Coming Soon)
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
            <p className="text-sm text-muted-foreground">
              Vibed with{' '}
              <a
                href="https://soapbox.pub/mkstack"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                MKStack
              </a>
            </p>
          </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Compact Login Area */}
            <div className="hidden lg:block w-80 overflow-hidden">
              <div className="sticky top-4 space-y-6">
                {/* Login Area */}
                <div className="p-3 overflow-hidden">
                  <LoginArea className="justify-end" />
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
