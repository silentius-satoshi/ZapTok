import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Zap,
  Settings2,
  FileVideo,
  Download,
  Upload,
  Clock,
  HardDrive,
  Gauge,
  CheckCircle2,
  Sparkles,
  Crown,
  Rocket
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  isAvailable?: boolean;
}

function FeatureCard({ icon, title, description, badge, isAvailable = false }: FeatureCardProps) {
  return (
    <Card className={`relative ${!isAvailable ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isAvailable ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {badge && (
                <Badge variant={isAvailable ? "default" : "secondary"} className="mt-1">
                  {badge}
                </Badge>
              )}
            </div>
          </div>
          {!isAvailable && (
            <Badge variant="outline" className="text-xs">
              Coming Soon
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ProModePage() {
  const currentFeatures = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Smart Video Compression",
      description: "Automatic video optimization using browser APIs for faster uploads and better streaming quality.",
      badge: "Available Now",
      isAvailable: true
    },
    {
      icon: <Upload className="h-5 w-5" />,
      title: "Instant Upload",
      description: "Streamlined upload process with real-time progress tracking and automatic thumbnail generation.",
      badge: "Available Now",
      isAvailable: true
    }
  ];

  const proFeatures = [
    {
      icon: <Settings2 className="h-5 w-5" />,
      title: "Advanced Compression Settings",
      description: "Professional-grade FFmpeg.js compression with custom bitrates, resolution targeting, and codec selection for maximum quality control.",
      badge: "Pro Feature"
    },
    {
      icon: <Gauge className="h-5 w-5" />,
      title: "Quality Tier Presets",
      description: "Ultra-low (10MB), Low (25MB), Medium (50MB), and High (90MB) quality presets optimized for different use cases and network conditions.",
      badge: "Pro Feature"
    },
    {
      icon: <HardDrive className="h-5 w-5" />,
      title: "Web Worker Processing",
      description: "Background compression using Web Workers to prevent UI freezing during heavy video processing tasks.",
      badge: "Pro Feature"
    },
    {
      icon: <FileVideo className="h-5 w-5" />,
      title: "Multi-Format Support",
      description: "Support for H.264, H.265, VP8, VP9, and AV1 codecs with automatic format detection and optimal codec selection.",
      badge: "Pro Feature"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Batch Processing",
      description: "Queue multiple videos for compression and upload with intelligent scheduling and progress management.",
      badge: "Pro Feature"
    },
    {
      icon: <Download className="h-5 w-5" />,
      title: "Export Compressed Videos",
      description: "Download your compressed videos locally before upload for reuse across platforms and storage optimization.",
      badge: "Pro Feature"
    }
  ];

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Crown className="h-8 w-8 text-orange-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
            ZapTok Pro Mode
          </h1>
          <Sparkles className="h-8 w-8 text-purple-500" />
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Professional video compression and processing tools for content creators who demand the highest quality and performance.
        </p>
      </div>

      {/* Current Features */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <h2 className="text-2xl font-semibold">Available Features</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {currentFeatures.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>

      <Separator className="my-12" />

      {/* Pro Features Coming Soon */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Rocket className="h-6 w-6 text-orange-500" />
          <h2 className="text-2xl font-semibold">Pro Features Coming Soon</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proFeatures.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>

      {/* Development Progress */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-500" />
            Development Progress
          </CardTitle>
          <CardDescription>
            Track the progress of Pro Mode features development
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>FFmpeg.js Integration</span>
              <span>25%</span>
            </div>
            <Progress value={25} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Web Worker Implementation</span>
              <span>15%</span>
            </div>
            <Progress value={15} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Quality Presets System</span>
              <span>40%</span>
            </div>
            <Progress value={40} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Advanced UI/UX</span>
              <span>10%</span>
            </div>
            <Progress value={10} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center mt-12 text-sm text-muted-foreground">
        <p>
          Pro Mode features are in active development. Current basic compression is available for all users.
        </p>
      </div>
    </div>
  );
}
