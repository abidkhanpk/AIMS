import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/mobile.css';
import Layout from '../components/Layout';
import Head from 'next/head';
import { ThemeProvider } from '../context/ThemeContext';
import { appWithTranslation } from 'next-i18next/pages';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <>
      <Head>
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/assets/app-logo.png" />
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

export default appWithTranslation(MyApp);
