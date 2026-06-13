import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/mobile.css';
import Layout from '../components/Layout';
import Head from 'next/head';
import Script from 'next/script';
import { ThemeProvider } from '../context/ThemeContext';
import { appWithTranslation } from 'next-i18next/pages';
import nextI18nConfig from '../../next-i18next.config.js';

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
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ThemeProvider>
      </SessionProvider>
    </>
  );
}

export default appWithTranslation(MyApp, nextI18nConfig);
