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
