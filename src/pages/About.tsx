import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { AuthGate } from '@/components/AuthGate';
import { LoginArea } from '@/components/auth/LoginArea';
import { useNavigate } from 'react-router-dom';

export function About() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
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
                    ZapTok is a simple, decentralized space for communities to gather, share, and grow — built by the
                    team at MKStack on the open Nostr protocol.
                  </p>
                </div>

                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Whether you're creating content, building your audience, or just looking for a safe space to
                    connect, ZapTok helps you create and join communities that reflect your values — without
                    compromising your privacy and no big tech server watching you. If you're a creator, artist,
                    developer, or builder looking for a freer, simpler way to share and engage online, ZapTok
                    gives you the tools to do that on your terms.
                  </p>

                  <p className="text-lg font-medium text-foreground">
                    We give you the keys. You drive the conversation.
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
                    <span>Post videos, notes and photos — share updates, reflections, or inspiration</span>
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
                    <span>Support creators through community-driven micropayments using Bitcoin Lightning and eCash via the Cashu protocol</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Support the voices you believe in — zap fellow creators, reward contributors, fund projects</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Receive support for your own work, creativity, or ideas from a like-minded community</span>
                  </li>
                </ul>
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

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button
                      variant="default"
                      onClick={() => window.open('https://soapbox.pub/mkstack', '_blank')}
                      className="flex-1"
                    >
                      Visit MKStack Community
                    </Button>
                    <Button
                      variant="outline"
                      disabled
                      className="flex-1 opacity-50 cursor-not-allowed"
                      title="Repository will be public soon"
                    >
                      GitHub (Coming Soon)
                    </Button>
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
