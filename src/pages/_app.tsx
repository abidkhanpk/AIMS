import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Layout from '../components/Layout';
import Head from 'next/head';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <>
      <Head>
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SessionProvider session={session}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </SessionProvider>
    </>
  );
}

export default MyApp;