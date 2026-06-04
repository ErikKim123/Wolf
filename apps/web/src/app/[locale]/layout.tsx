// Design Ref: §6 / §11.1 — locale 루트 레이아웃 (html lang + Header/Footer). 모든 페이지는 /[locale] 하위.
import '../globals.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Locale } from '@wolf/shared';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartProvider } from '@/lib/cart/CartContext';
import { createClient } from '@/lib/supabase/server';
import { getDictionary } from '@/i18n/dictionaries';
import { activeLocales, isActiveLocale } from '@/i18n/config';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  return {
    metadataBase: new URL(SITE),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(activeLocales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      url: `/${locale}`,
      siteName: 'Wolf',
      locale,
      type: 'website',
    },
  };
}

export function generateStaticParams() {
  return activeLocales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isActiveLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);

  const {
    data: { user },
  } = await createClient().auth.getUser();

  return (
    <html lang={locale}>
      <body>
        <CartProvider>
          <Header locale={locale} dict={dict} isAuthed={!!user} />
          <main className="min-h-[60vh]">{children}</main>
          <Footer locale={locale} dict={dict} />
        </CartProvider>
      </body>
    </html>
  );
}
