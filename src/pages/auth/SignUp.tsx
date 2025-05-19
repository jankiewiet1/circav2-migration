import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import SignUpForm from '@/components/auth/SignUpForm';
import { Button } from '@/components/ui/button';

export default function SignUp() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('signup.pageTitle')} | Circa</title>
        <meta name="description" content={t('signup.pageDescription')} />
      </Helmet>

      <div className="flex min-h-screen flex-col">
        <header className="border-b py-4">
          <div className="container flex items-center justify-between">
            <Link to="/">
              <img src="/logo.svg" alt="Circa" className="h-8" />
            </Link>
            <Button variant="ghost" asChild>
              <Link to="/auth/login">{t('common.login')}</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 container py-12">
          <div className="max-w-3xl mx-auto">
            <div className="mb-12 text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-3">
                {t('signup.title')}
              </h1>
              <p className="text-lg text-gray-600">
                {t('signup.subtitle')}
              </p>
            </div>

            <SignUpForm />

            <div className="mt-12 text-center space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">{t('signup.whyJoinWaitlist')}</h2>
                <div className="grid md:grid-cols-3 gap-6 mt-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="text-primary text-xl font-bold mb-2">1.</div>
                    <h3 className="font-medium mb-2">{t('signup.benefit1Title')}</h3>
                    <p className="text-gray-600 text-sm">{t('signup.benefit1Description')}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="text-primary text-xl font-bold mb-2">2.</div>
                    <h3 className="font-medium mb-2">{t('signup.benefit2Title')}</h3>
                    <p className="text-gray-600 text-sm">{t('signup.benefit2Description')}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="text-primary text-xl font-bold mb-2">3.</div>
                    <h3 className="font-medium mb-2">{t('signup.benefit3Title')}</h3>
                    <p className="text-gray-600 text-sm">{t('signup.benefit3Description')}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-sm">
                  {t('signup.privacyNotice')}
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-6 border-t">
          <div className="container text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Circa. {t('common.allRightsReserved')}</p>
          </div>
        </footer>
      </div>
    </>
  );
}