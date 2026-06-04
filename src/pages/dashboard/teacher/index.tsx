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
