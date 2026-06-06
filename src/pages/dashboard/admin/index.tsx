import React from 'react';
import AdminDashboard from '../../../components/dashboards/AdminDashboard';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default function AdminPage() {
  return <AdminDashboard />;
}
