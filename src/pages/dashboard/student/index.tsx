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
