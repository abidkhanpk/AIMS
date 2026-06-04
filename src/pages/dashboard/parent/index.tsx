import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';
import ParentDashboard from '../../../components/dashboards/ParentDashboard';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';

export default function ParentPage() {
    const { t } = useTranslation('common');
  return (
    <>
      <Head>
        <title>{t('auto.parentDashboardAims', `Parent Dashboard | AIMS`)}</title>
      </Head>
      <ParentDashboard />
    </>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
