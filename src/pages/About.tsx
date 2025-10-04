import { ArrowLeft, ExternalLink } from 'lucide-react';
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

                  <div className="pt-4 space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-between h-12 text-left"
                      onClick={() => window.open('https://soapbox.pub/mkstack', '_blank')}
                    >
                      <span>Soapbox Communities</span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-between h-12 text-left"
                      onClick={() => window.open('https://chorus.community/group/34550%3A8b12bddc423189c660156eab1ea04e1d44cc6621c550c313686705f704dda895%3Azaptok-mdgpgdbb', '_blank')}
                    >
                      <span>ZapTok on +Chorus</span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-between h-12 text-left"
                      onClick={() => window.open('https://github.com/silentius-satoshi/ZapTok/tree/main', '_blank')}
                    >
                      <span>GitHub</span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
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
  );
}

export default About;
