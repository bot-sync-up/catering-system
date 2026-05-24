import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2c5282" />
        <title>ענה את השואל</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div lang="he" dir="rtl">
        <Component {...pageProps} />
      </div>
    </>
  );
}
