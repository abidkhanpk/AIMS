import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface AuditLog {
  id: string;
  userId: string | null;
  actionType: string;
  resourceId: string | null;
  details: string;
  timestamp: string;
  user: { name: string; role: string } | null;
}

export default function AuditLogsTab() {
    const { t } = useTranslation('common');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/audit');
        if (!res.ok) throw new Error('Failed to fetch audit logs');
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">{t('auto.loadingAuditLogs', `Loading audit logs...`)}</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4 mb-0">
          <i className="bi bi-shield-lock text-primary me-2"></i>
          {t('auto.systemAuditLogs', `System Audit Logs`)}
                          </h2>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0 text-nowrap">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted small px-4 py-3">{t('auto.timestamp', `Timestamp`)}</th>
                  <th className="border-0 text-muted small py-3">{t('auto.user', `User`)}</th>
                  <th className="border-0 text-muted small py-3">{t('auto.action', `Action`)}</th>
                  <th className="border-0 text-muted small py-3">{t('auto.details', `Details`)}</th>
                  <th className="border-0 text-muted small py-3">{t('auto.resourceId', `Resource ID`)}</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      {t('auto.noAuditLogsRecordedYet', `No audit logs recorded yet.`)}
                                                              </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 text-muted small">
                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                      <td>
                        {log.user ? (
                          <>
                            <span className="fw-medium">{log.user.name}</span>
                            <Badge bg="secondary" className="ms-2">{log.user.role}</Badge>
                          </>
                        ) : (
                          <span className="text-muted fst-italic">{t('auto.system', `System`)}</span>
                        )}
                      </td>
                      <td>
                        <Badge bg="info">{log.actionType}</Badge>
                      </td>
                      <td className="text-wrap" style={{ minWidth: '300px' }}>
                        {log.details}
                      </td>
                      <td>
                        {log.resourceId ? (
                          <span className="font-monospace small text-muted">{log.resourceId}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
