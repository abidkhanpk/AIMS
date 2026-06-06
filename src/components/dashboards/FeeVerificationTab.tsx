import React, { useState, useEffect, useCallback } from 'react';
import { Table, Badge, Button, Alert, Spinner, Card, Form, Row, Col, Modal } from 'react-bootstrap';
import { Fee, FeeStatus } from '@prisma/client';
import { currencies } from '../../utils/currencies';
import { useTranslation } from 'react-i18next';

const FeeVerificationTab = () => {
    const { t } = useTranslation('common');
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROCESSING' | 'PENDING' | 'PAID'>('PROCESSING');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [editDueDate, setEditDueDate] = useState('');

  // Details/Verification modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [verifyingFeeId, setVerifyingFeeId] = useState<string | null>(null);

  const getCurrencySymbol = (code: string) => {
    return currencies.find((c: any) => c.code === code)?.symbol || code;
  };
  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'ALL' ? '/api/fees' : `/api/fees?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFees(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch fees');
        setFees([]);
      }
    } catch (error) {
      setError('Error fetching fees');
      setFees([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handleVerification = async (feeId: string, approve: boolean) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/fees/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId, approve }),
      });

      if (res.ok) {
        setSuccess(`Fee payment ${approve ? 'approved' : 'rejected'} successfully!`);
        fetchFees();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to verify payment');
      }
    } catch (error) {
      setError('Error verifying payment');
    }
  };

  const handleRevert = async (feeId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/fees/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId }),
      });
      if (res.ok) {
        setSuccess('Fee reverted to pending.');
        setStatusFilter('PENDING');
        fetchFees();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to revert fee');
      }
    } catch (error) {
      setError('Error reverting fee');
    }
  };

  const openEditModal = (fee: any) => {
    setEditingFee(fee);
    setEditTitle(fee.title || fee.feeDefinition?.title || '');
    setEditDescription(fee.description || '');
    setEditAmount(String(fee.amount || fee.feeDefinition?.amount || ''));
    setEditCurrency(fee.currency || fee.feeDefinition?.currency || 'USD');
    setEditDueDate(fee.dueDate ? new Date(fee.dueDate).toISOString().split('T')[0] : '');
    setShowEditModal(true);
  };

  const handleUpdateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editingFee) return;
    if (!editTitle || !editAmount || !editDueDate) {
      setError('Title, amount, and due date are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingFee.id,
          title: editTitle,
          description: editDescription,
          amount: parseFloat(editAmount),
          currency: editCurrency,
          dueDate: editDueDate,
        }),
      });

      if (res.ok) {
        setSuccess('Fee updated successfully!');
        setShowEditModal(false);
        setEditingFee(null);
        fetchFees();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update fee');
      }
    } catch (error) {
      setError('Error updating fee');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: FeeStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge bg="success">{t('auto.paid', `Paid`)}</Badge>;
      case 'PENDING':
        return <Badge bg="warning">{t('auto.pending', `Pending`)}</Badge>;
      case 'PROCESSING':
        return <Badge bg="info">{t('auto.processing', `Processing`)}</Badge>;
      case 'OVERDUE':
        return <Badge bg="danger">{t('auto.overdue', `Overdue`)}</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">{t('auto.cancelled', `Cancelled`)}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex align-items-center justify-content-between">
          <h6 className="mb-0">
            <i className="bi bi-check-circle me-2"></i>
            {t('auto.feeVerificationHistory', `Fee Verification & History`)}
                                </h6>
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0">{t('auto.status', `Status`)}</label>
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ width: 180 }}
            >
              <option value="ALL">{t('auto.all', `All`)}</option>
              <option value="PROCESSING">{t('auto.processing', `Processing`)}</option>
              <option value="PENDING">{t('auto.pending', `Pending`)}</option>
              <option value="PAID">{t('auto.paid', `Paid`)}</option>
            </select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">{t('auto.loadingFees', `Loading fees...`)}</p>
            </div>
          ) : fees.length === 0 ? (
            <div className="text-center py-4">
              <p className="mt-2 text-muted small">{t('auto.noFeesFoundForSelectedStatus', `No fees found for selected status`)}</p>
            </div>
          ) : (
            <Table hover size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>{t('auto.student', `Student`)}</th>
                  <th>{t('auto.feeTitle', `Fee Title`)}</th>
                  <th>{t('auto.status', `Status`)}</th>
                  <th>{t('auto.amount', `Amount`)}</th>
                  <th>{t('auto.paidAmount', `Paid Amount`)}</th>
                  <th>{t('auto.paidDate', `Paid Date`)}</th>
                  <th>{t('auto.paymentDetails', `Payment Details`)}</th>
                  <th>{t('auto.proof', `Proof`)}</th>
                  <th>{t('auto.actions', `Actions`)}</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee: any) => (
                  <tr key={fee.id}>
                    <td>{fee.student?.name || '-'}</td>
                    <td>{fee.title || fee.feeDefinition?.title || 'N/A'}</td>
                    <td>{getStatusBadge(fee.status)}</td>
                    <td>{(fee.amount || fee.feeDefinition?.amount)} {(fee.currency || fee.feeDefinition?.currency) || 'USD'}</td>
                    <td>{fee.paidAmount ?? '-'}</td>
                    <td>{fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : '-'}</td>
                    <td className="small">{fee.paymentDetails || '-'}</td>
                    <td>
                      {fee.paymentProof ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-decoration-none"
                          onClick={() => {
                            setSelectedFee(fee);
                            setShowDetailsModal(true);
                          }}
                        >
                          {t('auto.view', `View`)}
                        </Button>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-2"
                        onClick={() => {
                          setSelectedFee(fee);
                          setShowDetailsModal(true);
                        }}
                        title={t('auto.viewDetails', `View Details`)}
                      >
                        <i className="bi bi-eye"></i>
                      </Button>
                      {fee.status !== 'PAID' && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => openEditModal(fee)}
                          title={t('auto.editFee', `Edit Fee`)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                      )}
                      {fee.status === 'PROCESSING' && (
                        <>
                          <Button variant="outline-success" size="sm" onClick={() => handleVerification(fee.id, true)}>
                            <i className="bi bi-check-lg"></i>
                          </Button>
                          <Button variant="outline-danger" size="sm" className="ms-2" onClick={() => handleVerification(fee.id, false)}>
                            <i className="bi bi-x-lg"></i>
                          </Button>
                        </>
                      )}
                      {fee.status === 'PAID' && (
                        <Button variant="outline-warning" size="sm" onClick={() => handleRevert(fee.id)} title={t('auto.revertToPending', `Revert to Pending`)}>
                          <i className="bi bi-arrow-counterclockwise"></i>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Edit Fee Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('auto.editFee', `Edit Fee`)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateFee}>
            <Form.Group className="mb-3">
              <Form.Label>{t('auto.title', `Title`)}</Form.Label>
              <Form.Control
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('auto.description', `Description`)}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.amount', `Amount`)}</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
                  <Form.Select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    required
                  >
                    {currencies.map((curr: any) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name} ({curr.code})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>{t('auto.dueDate', `Due Date`)}</Form.Label>
              <Form.Control
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                className="me-2"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                {t('auto.cancel', `Cancel`)}
                                            </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* View Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-file-earmark-text me-2"></i>
            {t('auto.feePaymentDetailsTitle', 'Fee Payment Details')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFee && (
            <div>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.studentLabel', 'Student:')}</strong>{' '}
                  <span className="fw-medium">{selectedFee.student?.name || '-'}</span>
                </Col>
                <Col md={6}>
                  <strong>{t('auto.statusLabel', 'Status:')}</strong>{' '}
                  {getStatusBadge(selectedFee.status)}
                </Col>
              </Row>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.feeTitleLabel', 'Fee Title:')}</strong>{' '}
                  <span className="fw-medium">{selectedFee.title || selectedFee.feeDefinition?.title || 'N/A'}</span>
                </Col>
                <Col md={6}>
                  <strong>{t('auto.dueDateLabel', 'Due Date:')}</strong>{' '}
                  {selectedFee.dueDate ? new Date(selectedFee.dueDate).toLocaleDateString() : '-'}
                </Col>
              </Row>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.amountLabel', 'Expected Amount:')}</strong>{' '}
                  <span className="fw-bold text-success">
                    {getCurrencySymbol(selectedFee.currency || selectedFee.feeDefinition?.currency || 'USD')}
                    {(selectedFee.amount || selectedFee.feeDefinition?.amount || 0).toFixed(2)}
                  </span>
                </Col>
                <Col md={6}>
                  <strong>{t('auto.paidAmountLabel', 'Paid Amount:')}</strong>{' '}
                  <span className="fw-bold text-success">
                    {selectedFee.paidAmount !== undefined && selectedFee.paidAmount !== null ? (
                      `${getCurrencySymbol(selectedFee.currency || selectedFee.feeDefinition?.currency || 'USD')}${selectedFee.paidAmount.toFixed(2)}`
                    ) : (
                      '-'
                    )}
                  </span>
                </Col>
              </Row>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.paidDateLabel', 'Submitted/Paid Date:')}</strong>{' '}
                  {selectedFee.paidDate ? new Date(selectedFee.paidDate).toLocaleDateString() : '-'}
                </Col>
                <Col md={6}>
                  <strong>{t('auto.paidByLabel', 'Paid By:')}</strong>{' '}
                  {selectedFee.paidBy ? `${selectedFee.paidBy.name} (${selectedFee.paidBy.email})` : '-'}
                </Col>
              </Row>
              {selectedFee.description && (
                <div className="mb-3 border-bottom pb-2">
                  <strong>{t('auto.descriptionLabel', 'Description:')}</strong>
                  <p className="bg-light p-2 rounded mt-1 border" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedFee.description}
                  </p>
                </div>
              )}
              <div className="mb-3 border-bottom pb-2">
                <strong>{t('auto.detailsLabel', 'Payment Details/Remarks:')}</strong>
                <p className="bg-light p-2 rounded mt-1 border" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedFee.paymentDetails || t('auto.noDetailsSubmitted', 'No details submitted')}
                </p>
              </div>
              <div className="mb-3">
                <strong>{t('auto.paymentProof', 'Payment Proof:')}</strong>
                {selectedFee.paymentProof ? (
                  <div className="mt-2 border rounded p-2 bg-light text-center">
                    <div className="mb-2">
                      <a
                        href={selectedFee.paymentProof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-box-arrow-up-right me-1"></i>
                        {t('auto.openInNewTab', 'Open Image in New Tab')}
                      </a>
                    </div>
                    <img
                      src={selectedFee.paymentProof}
                      alt={t('auto.paymentProofAlt', 'Payment Proof Screenshot')}
                      className="img-fluid rounded border shadow-sm"
                      style={{ maxHeight: '400px', objectFit: 'contain', cursor: 'pointer' }}
                      onClick={() => window.open(selectedFee.paymentProof, '_blank')}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.style.display = 'none';
                        const msg = img.nextSibling as HTMLElement | null;
                        if (msg) msg.style.display = 'block';
                      }}
                    />
                    <p className="text-danger small mt-1" style={{ display: 'none' }}>
                      {t('auto.imageLoadError', 'Could not load image. Use "Open Image in New Tab" to view it.')}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted mt-1">{t('auto.noProofUploaded', 'No proof screenshot uploaded')}</p>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedFee && selectedFee.status === 'PROCESSING' && (
            <div className="d-flex gap-2 me-auto">
              <Button
                variant="success"
                disabled={verifyingFeeId === selectedFee.id}
                onClick={async () => {
                  setVerifyingFeeId(selectedFee.id);
                  await handleVerification(selectedFee.id, true);
                  setVerifyingFeeId(null);
                  setShowDetailsModal(false);
                }}
              >
                {verifyingFeeId === selectedFee.id ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-check-lg me-1"></i>}
                {t('auto.approve', 'Approve')}
              </Button>
              <Button
                variant="danger"
                disabled={verifyingFeeId === selectedFee.id}
                onClick={async () => {
                  setVerifyingFeeId(selectedFee.id);
                  await handleVerification(selectedFee.id, false);
                  setVerifyingFeeId(null);
                  setShowDetailsModal(false);
                }}
              >
                {verifyingFeeId === selectedFee.id ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-x-lg me-1"></i>}
                {t('auto.reject', 'Reject')}
              </Button>
            </div>
          )}
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            {t('auto.close', 'Close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FeeVerificationTab;
