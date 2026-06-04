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
