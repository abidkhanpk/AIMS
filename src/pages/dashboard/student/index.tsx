import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';
import StudentDashboard from '../../../components/dashboards/StudentDashboard';
import Head from 'next/head';

export default function StudentPage() {
  return (
    <>
      <Head>
        <title>Student Dashboard | AIMS</title>
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
