import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';
import DeveloperDashboard from '../../../components/dashboards/DeveloperDashboard';
import Head from 'next/head';

export default function DeveloperPage() {
  return (
    <>
      <Head>
        <title>Developer Dashboard | AIMS</title>
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
