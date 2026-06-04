import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';
import ParentDashboard from '../../../components/dashboards/ParentDashboard';
import Head from 'next/head';

export default function ParentPage() {
  return (
    <>
      <Head>
        <title>Parent Dashboard | AIMS</title>
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
