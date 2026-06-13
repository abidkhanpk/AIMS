import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Container } from 'react-bootstrap';

export default function Custom404() {
  const { t } = useTranslation('common');
  return (
    <Container className="text-center py-5 my-5">
      <div className="py-5">
        <i className="bi bi-exclamation-triangle display-1 text-warning mb-4 d-block"></i>
        <h1 className="display-4 fw-bold mb-3">404 - {t('auto.pageNotFound', 'Page Not Found')}</h1>
        <p className="lead text-muted mb-4">
          {t('auto.pageNotFoundMsg', 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.')}
        </p>
        <Link href="/dashboard" className="btn btn-primary btn-lg px-4">
          <i className="bi bi-house me-2"></i>
          {t('auto.backToDashboard', 'Back to Dashboard')}
        </Link>
      </div>
    </Container>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
