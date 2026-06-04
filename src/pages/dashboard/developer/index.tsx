import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';
import DeveloperDashboard from '../../../components/dashboards/DeveloperDashboard';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';

export default function DeveloperPage() {
    const { t } = useTranslation('common');
  return (
    <>
      <Head>
        <title>{t('auto.developerDashboardAims', `Developer Dashboard | AIMS`)}</title>
      </Head>
      <DeveloperDashboard />
    </>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
