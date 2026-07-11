import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { SessionProvider, useSession } from 'next-auth/react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/mobile.css';
import Layout from '../components/Layout';
import Head from 'next/head';
import Script from 'next/script';
import { ThemeProvider } from '../context/ThemeContext';
import { appWithTranslation } from 'next-i18next/pages';
import nextI18nConfig from '../../next-i18next.config.js';

function RoutePrefixer({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (url.startsWith('/_next') || url.startsWith('/api')) return;
      const pathOnly = url.split('?')[0].split('#')[0];
      const segments = pathOnly.split('/').filter(Boolean);
      
      let hasLocale = false;
      let locale = '';
      if (segments[0] && ['en', 'ur'].includes(segments[0])) {
        hasLocale = true;
        locale = segments.shift() || '';
      }

      // 1. Intercept unauthenticated transitions to auth pages to preserve slug
      const targetPath = '/' + segments.join('/');
      if (targetPath === '/auth/signin' || targetPath === '/auth/forgot-password') {
        const currentPath = window.location.pathname;
        const currentSegments = currentPath.split('/').filter(Boolean);
        
        if (currentSegments[0] && ['en', 'ur'].includes(currentSegments[0])) {
          currentSegments.shift();
        }
        
        const RESERVED_WORDS = new Set(['auth', 'dashboard', 'register', 'messages', 'privacy-policy', 'developer', '404', 'en', 'ur']);
        if (currentSegments[0] && !RESERVED_WORDS.has(currentSegments[0])) {
          const currentSlug = currentSegments[0];
          const queryStr = url.includes('?') ? url.substring(url.indexOf('?')) : '';
          const targetUrl = hasLocale
            ? `/${locale}/${currentSlug}${targetPath}${queryStr}`
            : `/${currentSlug}${targetPath}${queryStr}`;
            
          router.push(targetUrl);
          throw 'routeChangeAborted';
        }
      }

      // 2. Intercept authenticated user transitions to prepend slug
      if (session?.user) {
        const sessionSlug = (session.user as any).academySlug;
        if (sessionSlug && session.user.role !== 'DEVELOPER') {
          if (segments[0] && segments[0] !== sessionSlug) {
            const relativeUrl = segments.join('/');
            const queryStr = url.includes('?') ? url.substring(url.indexOf('?')) : '';
            const targetUrl = hasLocale
              ? `/${locale}/${sessionSlug}/${relativeUrl}${queryStr}`
              : `/${sessionSlug}/${relativeUrl}${queryStr}`;
              
            router.push(targetUrl);
            throw 'routeChangeAborted';
          }
        }
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [session, router]);

  return <>{children}</>;
}

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  
  useEffect(() => {
    const dir = router.locale === 'ur' ? 'rtl' : 'ltr';
    const lang = router.locale || 'en';
    
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    
    if (router.locale === 'ur') {
      document.body.classList.add('lang-ur');
    } else {
      document.body.classList.remove('lang-ur');
    }
  }, [router.locale]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (reg) => console.log('Service Worker registered successfully with scope:', reg.scope),
          (err) => console.error('Service Worker registration failed:', err)
        );
      });
    }
  }, []);

  return (
    <>
      <Head>
        {router.locale === 'ur' ? (
          <link 
            rel="stylesheet" 
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" 
            integrity="sha384-dpuaG1suU0eT09tx5plTaGMLBsfDLzUCCUXOY2j/LSvXYuG6Bqs43ALlhIqAJVRb" 
            crossOrigin="anonymous"
          />
        ) : null}
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AIMS" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#0d6efd" />
      </Head>
      <SessionProvider session={session}>
        <ThemeProvider>
          <RoutePrefixer>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </RoutePrefixer>
        </ThemeProvider>
      </SessionProvider>
    </>
  );
}

export default appWithTranslation(MyApp, nextI18nConfig);
