import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';
import StudentDashboard from '../../../components/dashboards/StudentDashboard';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';

export default function StudentPage() {
    const { t } = useTranslation('common');
  return (
    <>
      <Head>
        <title>{t('auto.studentDashboardAims', `Student Dashboard | AIMS`)}</title>
      </Head>
      <StudentDashboard />
    </>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
