import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import React from 'react';
import TeacherDashboard from '../../../components/dashboards/TeacherDashboard';
import Head from 'next/head';

export default function TeacherPage() {
  return (
    <>
      <Head>
        <title>Teacher Dashboard | AIMS</title>
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
