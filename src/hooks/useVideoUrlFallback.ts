import { useState, useEffect, useCallback, useRef } from 'react';
import { bundleLog } from '@/lib/devConsole';
import { isYouTubeUrl } from '@/lib/youtubeEmbed';

interface VideoUrlFallbackOptions {
  originalUrl?: string;
  hash?: string;
  title?: string;
}

export function useVideoUrlFallback({ originalUrl, hash, title }: VideoUrlFallbackOptions) {
  const [workingUrl, setWorkingUrl] = useState<string | null>(originalUrl || null);
  const [isTestingUrls, setIsTestingUrls] = useState(false);
  const [testedUrls, setTestedUrls] = useState<Set<string>>(new Set());

  // Use refs to track if we've already processed this combination
  const processedRef = useRef<string>('');
  const currentInputs = `${originalUrl || ''}-${hash || ''}-${title || ''}`;

  useEffect(() => {
    // Skip if already processed this exact combination
    if (processedRef.current === currentInputs) return;
    processedRef.current = currentInputs;

    if (!originalUrl && !hash) return;

    // YouTube URLs should not be tested - they're for iframe embedding
    if (originalUrl && isYouTubeUrl(originalUrl)) {
      if (import.meta.env.DEV) {
        bundleLog('videoUrlTesting', `🎬 URL [${title?.slice(0, 20) || 'video'}]: YouTube embed URL - skipping URL tests`);
      }
      setWorkingUrl(originalUrl);
      setTestedUrls(prev => new Set([...prev, originalUrl]));
      return;
    }

    // Special handling for URLs that are known to have CORS restrictions
    const isCorsRestrictedUrl = (url: string) => {
      return url.includes('m.primal.net') ||
             url.includes('r2a.primal.net') ||
             url.includes('blossom.primal.net') ||
             url.includes('primal.net');
    };

    // If we have a CORS-restricted URL, trust it without testing
    if (originalUrl && isCorsRestrictedUrl(originalUrl)) {
      if (import.meta.env.DEV) {
        bundleLog('videoUrlTesting', `🎬 URL [${title?.slice(0, 20) || 'video'}]: Trusting CORS-restricted URL without testing - ${originalUrl.split('/').pop()?.slice(0, 12)}...`);
      }
      setWorkingUrl(originalUrl);
      setTestedUrls(prev => new Set([...prev, originalUrl]));
      return;
    }

    const testUrls = async () => {
      if (isTestingUrls) return;
      setIsTestingUrls(true);

      // Capture current testedUrls at the time of function call
      const currentTestedUrls = testedUrls;

      // Prepare list of URLs to test (filter out CORS-restricted URLs)
      const urlsToTest: string[] = [];

      if (originalUrl && !currentTestedUrls.has(originalUrl) && !isCorsRestrictedUrl(originalUrl)) {
        urlsToTest.push(originalUrl);
      }

      if (hash) {
        const hashUrls = [
          `https://blossom.band/${hash}`,
          `https://nostr.download/${hash}`,
          `https://blossom.primal.net/${hash}`, // Note: this might also have CORS issues
          `https://nostrage.com/${hash}.mp4`,
          `https://void.cat/${hash}`,
        ];

        hashUrls.forEach(url => {
          if (!currentTestedUrls.has(url) && !isCorsRestrictedUrl(url)) {
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

    // Only test if we haven't already processed this combination and aren't currently testing
    if (!isTestingUrls) {
      testUrls();
    }
  }, [originalUrl, hash, title]); // Removed isTestingUrls, workingUrl, and testedUrls from deps

  return {
    workingUrl,
    isTestingUrls,
    hasTestedUrls: testedUrls.size > 0,
  };
}
