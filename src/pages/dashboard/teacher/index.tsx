import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';
import TeacherDashboard from '../../../components/dashboards/TeacherDashboard';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';

export default function TeacherPage() {
    const { t } = useTranslation('common');
  return (
    <>
      <Head>
        <title>{t('auto.teacherDashboardAims', `Teacher Dashboard | AIMS`)}</title>
      </Head>
      <TeacherDashboard />
    </>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
