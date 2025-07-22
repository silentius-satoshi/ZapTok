import { useState, useEffect } from 'react';

interface VideoUrlFallbackOptions {
  originalUrl?: string;
  hash?: string;
  title?: string;
}

export function useVideoUrlFallback({ originalUrl, hash, title }: VideoUrlFallbackOptions) {
  const [workingUrl, setWorkingUrl] = useState<string | null>(originalUrl || null);
  const [isTestingUrls, setIsTestingUrls] = useState(false);
  const [testedUrls, setTestedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!originalUrl && !hash) return;
    
    const testUrls = async () => {
      if (isTestingUrls) return;
      setIsTestingUrls(true);

      // Prepare list of URLs to test
      const urlsToTest: string[] = [];
      
      if (originalUrl && !testedUrls.has(originalUrl)) {
        urlsToTest.push(originalUrl);
      }
      
      if (hash) {
        const hashUrls = [
          `https://cdn.satellite.earth/${hash}`,
          `https://blossom.primal.net/${hash}`,
          `https://nostrage.com/${hash}.mp4`,
          `https://nostr.download/${hash}.mp4`,
          `https://void.cat/${hash}`,
        ];
        
        hashUrls.forEach(url => {
          if (!testedUrls.has(url)) {
            urlsToTest.push(url);
          }
        });
      }

      console.log(`🧪 Testing ${urlsToTest.length} video URLs for "${title || 'video'}"`);

      // Test URLs concurrently with timeout
      for (const url of urlsToTest.slice(0, 3)) { // Limit to first 3 to avoid overwhelming
        try {
          console.log('🔍 Testing URL:', url);
          
          const response = await Promise.race([
            fetch(url, { method: 'HEAD' }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 2000)
            )
          ]);
          
          if (response.ok) {
            console.log('✅ Working URL found:', url);
            setWorkingUrl(url);
            setTestedUrls(prev => new Set([...prev, url]));
            break;
          } else {
            console.log('❌ URL failed:', response.status, url);
          }
        } catch (error) {
          console.log('🚫 URL test error:', error instanceof Error ? error.message : 'Unknown error', url);
        }
        
        setTestedUrls(prev => new Set([...prev, url]));
      }
      
      setIsTestingUrls(false);
    };

    // Only test if we don't already have a working URL
    if (!workingUrl || !testedUrls.has(workingUrl)) {
      testUrls();
    }
  }, [originalUrl, hash, title, isTestingUrls, workingUrl, testedUrls]);

  return {
    workingUrl,
    isTestingUrls,
    hasTestedUrls: testedUrls.size > 0,
  };
}
