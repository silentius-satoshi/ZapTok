import { useState, useEffect } from 'react';
import { devLog, bundleLog } from '@/lib/devConsole';

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
          `https://blossom.band/${hash}`,
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

      // Bundle URL testing logs
      const urlTestingStats = {
        title: title?.slice(0, 20) || 'video',
        totalUrls: urlsToTest.length,
        testedUrls: 0,
        workingUrl: null as string | null,
      };

      // Test URLs concurrently with timeout
      let foundWorkingUrl = false;
      for (const url of urlsToTest.slice(0, 3)) { // Limit to first 3 to avoid overwhelming
        try {
          urlTestingStats.testedUrls++;

          const response = await Promise.race([
            fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(2000) }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 2000)
            )
          ]);

          if (response.ok) {
            urlTestingStats.workingUrl = url.split('/').pop()?.slice(0, 12) + '...';

            if (import.meta.env.DEV) {
              bundleLog('videoUrlTesting', `🎬 URL Test [${urlTestingStats.title}]: Found working URL (${urlTestingStats.testedUrls}/${urlTestingStats.totalUrls} tested)`);
            }

            setWorkingUrl(url);
            setTestedUrls(prev => new Set([...prev, url]));
            foundWorkingUrl = true;
            break;
          } else {
            bundleLog('videoUrlErrors', `❌ URL failed: ${response.status} ${url}`);
          }
        } catch (error) {
          bundleLog('videoUrlErrors', `🚫 URL test error: ${error instanceof Error ? error.message : 'Unknown error'} - ${url}`);
        }

        setTestedUrls(prev => new Set([...prev, url]));
      }

      // If no working URL was found after testing all URLs, set to null
      if (!foundWorkingUrl && urlsToTest.length > 0) {
        if (import.meta.env.DEV) {
          bundleLog('videoUrlTesting', `❌ URL Test [${urlTestingStats.title}]: No working URLs found (${urlTestingStats.testedUrls}/${urlTestingStats.totalUrls} tested)`);
        }
        setWorkingUrl(null);
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
