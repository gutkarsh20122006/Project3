import { SessionProvider } from 'next-auth/react';
import Head from 'next/head';
import { Layout } from '../components/Layout';
import '../styles/globals.css';

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}) {
  return (
    <SessionProvider session={session} refetchInterval={5 * 60}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>DocuChat — Chat with your PDFs</title>
        <meta
          name="description"
          content="Upload PDF documents and ask questions using AI-powered retrieval augmented generation."
        />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </SessionProvider>
  );
}
