import React from 'react';
import AdminDashboard from '../../../components/dashboards/AdminDashboard';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useTranslation } from 'react-i18next';

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default function AdminPage() {
    const { t } = useTranslation('common');
  return (
    <>
      <Head>
        <title>{t('auto.adminDashboardAims', `Admin Dashboard | AIMS`)}</title>
      </Head>
      <AdminDashboard />
    </>
  );
}
