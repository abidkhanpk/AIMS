import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Table, Card, Row, Col, Alert, Spinner, Badge, Modal, Nav, Tab } from 'react-bootstrap';
import { FeeStatus, FeeType } from '@prisma/client';

interface StudentRef { id: string; name?: string }
interface StudentFeeDefinitionRef { student: StudentRef }

interface FeeDefinition {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  type: FeeType;
  generationDay: number;
  startDate: string; // ISO string
  dueAfterDays?: number;
  studentFeeDefinitions?: StudentFeeDefinitionRef[];
}

const feeTypes = Object.values(FeeType);

import { currencies } from '../../utils/currencies';
import { useTranslation } from 'react-i18next';

const getCurrencySymbol = (code: string) => {
  return currencies.find((c: any) => c.code === code)?.symbol || code;
};

function FeeSubform({ studentId, onFeeChange }: { studentId: string; onFeeChange: () => void; }) {
    const { t } = useTranslation('common');
  const [feeDefinitions, setFeeDefinitions] = useState<FeeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state (used for both create and edit)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [type, setType] = useState<FeeType>('MONTHLY');
  const [generationDay, setGenerationDay] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [dueAfterDays, setDueAfterDays] = useState('7');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeeDefinition | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFeeDefinition, setEditingFeeDefinition] = useState<FeeDefinition | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Payments tab
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'definitions' | 'payments'>('definitions');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setCurrency('USD');
    setType('MONTHLY');
    setGenerationDay('1');
    setStartDate('');
    setDueAfterDays('7');
    setEditingFeeDefinition(null);
  };

  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/fees/definitions?studentId=${studentId}`);
      if (res.ok) {
        const data: FeeDefinition[] = await res.json();
        const filtered = (Array.isArray(data) ? data : []).filter(fd =>
          (fd.studentFeeDefinitions || []).some(sfd => sfd.student.id === studentId)
        );
        setFeeDefinitions(filtered);
      } else {
        setError('Failed to fetch fee definitions');
        setFeeDefinitions([]);
      }
    } catch (error) {
      setError('Error fetching fee definitions');
      setFeeDefinitions([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const fetchPayments = useCallback(async () => {
    try {
      setPaymentsLoading(true);
      const res = await fetch('/api/fees');
      if (res.ok) {
        const data = await res.json();
        const filtered = (Array.isArray(data) ? data : []).filter((fee) => fee.student?.id === studentId);
        setFeePayments(filtered);
      } else {
        setError('Failed to fetch fee payments');
        setFeePayments([]);
      }
    } catch (err) {
      setError('Error fetching fee payments');
      setFeePayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      fetchFees();
      fetchPayments();
    }
  }, [studentId, fetchFees, fetchPayments]);

  const handleCreateFeeDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/fees/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          amount: parseFloat(amount),
          currency,
          type,
          generationDay: parseInt(generationDay, 10),
          startDate,
          dueAfterDays: parseInt(dueAfterDays, 10),
          studentIds: [studentId],
        }),
      });

      if (res.ok) {
        setSuccess('Fee definition created successfully!');
        resetForm();
        setShowCreateForm(false);
        fetchFees();
        onFeeChange();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create fee definition');
      }
    } catch (error) {
      setError('Error creating fee definition');
    } finally {
      setCreating(false);
    }
  };

  const askDeleteFeeDefinition = (fd: FeeDefinition) => {
    setDeleteTarget(fd);
    setShowDeleteModal(true);
  };

  const confirmDeleteFeeDefinition = async () => {
    if (!deleteTarget) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/fees/definitions/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (res.ok || res.status === 204) {
        setSuccess('Fee definition deleted successfully!');
        setShowDeleteModal(false);
        setDeleteTarget(null);
        fetchFees();
        onFeeChange();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to delete fee definition');
      }
    } catch (error) {
      setError('Error deleting fee definition');
    }
  };

  const handleEditFeeDefinition = (fd: FeeDefinition) => {
    setEditingFeeDefinition(fd);
    setTitle(fd.title);
    setDescription(fd.description || '');
    setAmount(fd.amount.toString());
    setCurrency(fd.currency);
    setType(fd.type);
    setGenerationDay(fd.generationDay.toString());
    setStartDate(new Date(fd.startDate).toISOString().split('T')[0]);
    setDueAfterDays((fd.dueAfterDays ?? 7).toString());
    setShowEditModal(true);
  };

  const handleUpdateFeeDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeeDefinition) return;

    setEditing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/fees/definitions/${editingFeeDefinition.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          amount: parseFloat(amount),
          currency,
          type,
          generationDay: parseInt(generationDay, 10),
          startDate,
          dueAfterDays: parseInt(dueAfterDays, 10),
        }),
      });

      if (res.ok) {
        setSuccess('Fee definition updated successfully!');
        setShowEditModal(false);
        setEditingFeeDefinition(null);
        fetchFees();
        onFeeChange();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update fee definition');
      }
    } catch (error) {
      setError('Error updating fee definition');
    } finally {
      setEditing(false);
    }
  };

  const renderForm = (handleSubmit: (e: React.FormEvent) => void, isEditing = false) => (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>{t('auto.title', `Title`)}</Form.Label>
        <Form.Control type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>{t('auto.description', `Description`)}</Form.Label>
        <Form.Control as="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Form.Group>
      <Row>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>{t('auto.amount', `Amount`)}</Form.Label>
            <Form.Control type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
            <Form.Select value={currency} onChange={(e) => setCurrency(e.target.value)} required>
              {currencies.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.name} ({curr.code})
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>{t('auto.type', `Type`)}</Form.Label>
        <Form.Select value={type} onChange={(e) => setType(e.target.value as FeeType)} required>
          {feeTypes.map((feeType) => (
            <option key={feeType} value={feeType}>{feeType}</option>
          ))}
        </Form.Select>
      </Form.Group>
      <Row>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>{t('auto.generationDay', `Generation Day`)}</Form.Label>
            <Form.Control type="number" value={generationDay} onChange={(e) => setGenerationDay(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>{t('auto.startDate', `Start Date`)}</Form.Label>
            <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>{t('auto.dueDateAfterDays', `Due Date After (Days)`)}</Form.Label>
        <Form.Control type="number" value={dueAfterDays} onChange={(e) => setDueAfterDays(e.target.value)} required />
        <Form.Text className="text-muted">{t('auto.dateAfterTheseNumberOfDaysAfte', `Date after these number of days after generation day is set as due date.`)}</Form.Text>
      </Form.Group>
      <Button variant="primary" type="submit" disabled={isEditing ? editing : creating} className="w-100">
        {isEditing ? (editing ? 'Updating...' : 'Update Fee Definition') : (creating ? 'Creating...' : 'Create Fee Definition')}
      </Button>
    </Form>
  );

  const handleVerifyDirect = async (feeId: string, approve: boolean) => {
    setVerifying(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/fees/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId, approve }),
      });
      if (res.ok) {
        setSuccess(approve ? 'Payment verified' : 'Payment rejected');
        fetchPayments();
        onFeeChange();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to process verification');
      }
    } catch (err) {
      setError('Error verifying payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = async (approve: boolean) => {
    if (!verifyTarget) return;
    await handleVerifyDirect(verifyTarget.id, approve);
    setVerifyTarget(null);
  };

  const handleTabSelect = (key: string | null) => {
    const next = (key || 'definitions') as 'definitions' | 'payments';
    setActiveTab(next);
    if (next === 'payments') {
      setShowCreateForm(false);
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="mb-3">
        <Tab.Container activeKey={activeTab} onSelect={handleTabSelect}>
          <div className="d-flex justify-content-between align-items-center px-3 pt-3">
            <Nav variant="tabs" className="flex-grow-1">
              <Nav.Item>
                <Nav.Link eventKey="definitions">{t('auto.feeDefinitions', `Fee Definitions`)} <Badge bg="primary">{feeDefinitions.length}</Badge></Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="payments">{t('auto.feePayments', `Fee Payments`)}</Nav.Link>
              </Nav.Item>
            </Nav>
            {activeTab === 'definitions' && (
              <Button
                size="sm"
                className="ms-3"
                variant={showCreateForm ? 'secondary' : 'primary'}
                onClick={() => {
                  if (showCreateForm) {
                    resetForm();
                  }
                  setShowCreateForm((prev) => !prev);
                }}
              >
                {showCreateForm ? 'Hide Form' : 'Add Fee Definition'}
              </Button>
            )}
          </div>

          <Tab.Content>
            <Tab.Pane eventKey="definitions">
              {showCreateForm && (
                <Card.Body className="border-bottom">
                  <Form onSubmit={handleCreateFeeDefinition}>
                    <Row className="g-3">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>{t('auto.title', `Title`)}</Form.Label>
                          <Form.Control type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>{t('auto.amount', `Amount`)}</Form.Label>
                          <Form.Control type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
                          <Form.Select value={currency} onChange={(e) => setCurrency(e.target.value)} required>
                            {currencies.map(curr => (
                              <option key={curr.code} value={curr.code}>
                                {curr.symbol} {curr.name} ({curr.code})
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>{t('auto.type', `Type`)}</Form.Label>
                          <Form.Select value={type} onChange={(e) => setType(e.target.value as FeeType)} required>
                            {feeTypes.map((feeType) => (
                              <option key={feeType} value={feeType}>{feeType}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>{t('auto.generationDay', `Generation Day`)}</Form.Label>
                          <Form.Control type="number" value={generationDay} onChange={(e) => setGenerationDay(e.target.value)} required />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>{t('auto.startDate', `Start Date`)}</Form.Label>
                          <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>{t('auto.dueDateAfterDays', `Due Date After (Days)`)}</Form.Label>
                          <Form.Control type="number" value={dueAfterDays} onChange={(e) => setDueAfterDays(e.target.value)} required />
                          <Form.Text className="text-muted">{t('auto.dateAfterTheseNumberOfDaysAfte', `Date after these number of days after generation day is set as due date.`)}</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label>{t('auto.description', `Description`)}</Form.Label>
                          <Form.Control as="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => {
                          resetForm();
                          setShowCreateForm(false);
                        }}
                        disabled={creating}
                      >
                        {t('auto.cancel', `Cancel`)}
                                                                    </Button>
                      <Button variant="primary" type="submit" disabled={creating}>
                        {creating ? 'Creating...' : 'Save Fee Definition'}
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              )}

              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2 text-muted small">{t('auto.loadingFeeDefinitions', `Loading fee definitions...`)}</p>
                  </div>
                ) : feeDefinitions.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-list-task display-6 text-muted"></i>
                    <p className="mt-2 text-muted small">{t('auto.noFeeDefinitionsFound', `No fee definitions found`)}</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>{t('auto.title', `Title`)}</th>
                          <th>{t('auto.amount', `Amount`)}</th>
                          <th>{t('auto.type', `Type`)}</th>
                          <th>{t('auto.actions', `Actions`)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeDefinitions.map((fd) => (
                          <tr key={fd.id}>
                            <td className="fw-medium">{fd.title}</td>
                            <td>{fd.amount} {fd.currency}</td>
                            <td>{fd.type}</td>
                            <td>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditFeeDefinition(fd)}
                                title={t('auto.editFeeDefinition', `Edit Fee Definition`)}
                                className="me-2"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => askDeleteFeeDefinition(fd)}
                                title={t('auto.deleteFeeDefinition', `Delete Fee Definition`)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Tab.Pane>

            <Tab.Pane eventKey="payments">
              <Card.Body className="p-0">
                {paymentsLoading ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2 text-muted small">{t('auto.loadingPayments', `Loading payments...`)}</p>
                  </div>
                ) : feePayments.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-receipt-cutoff display-6 text-muted"></i>
                    <p className="mt-2 text-muted small">{t('auto.noFeePaymentsFound', `No fee payments found`)}</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>{t('auto.title', `Title`)}</th>
                          <th>{t('auto.amount', `Amount`)}</th>
                          <th>{t('auto.status', `Status`)}</th>
                          <th>{t('auto.paidDate', `Paid Date`)}</th>
                          <th>{t('auto.actions', `Actions`)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feePayments.map((fee) => (
                          <tr key={fee.id}>
                            <td className="fw-medium">{fee.feeDefinition?.title || fee.title}</td>
                            <td>{fee.feeDefinition?.amount || fee.amount} {fee.feeDefinition?.currency || fee.currency}</td>
                            <td>
                              <Badge bg={
                                fee.status === 'PAID' ? 'success' :
                                fee.status === 'PROCESSING' ? 'warning' :
                                fee.status === 'OVERDUE' ? 'danger' : 'secondary'
                              }>
                                {fee.status}
                              </Badge>
                            </td>
                            <td className="text-muted small">
                              {fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : '-'}
                            </td>
                            <td>
                              <Button
                                variant="outline-info"
                                size="sm"
                                className="me-2"
                                onClick={() => setVerifyTarget(fee)}
                                title={fee.status === 'PROCESSING' ? t('auto.verifyPayment', 'Verify Payment') : t('auto.viewDetails', 'View Details')}
                              >
                                <i className="bi bi-eye"></i>
                              </Button>
                              {fee.status === 'PROCESSING' && (
                                <>
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleVerifyDirect(fee.id, true)}
                                    title={t('auto.approve', 'Approve')}
                                  >
                                    <i className="bi bi-check-lg"></i>
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="ms-2"
                                    onClick={() => handleVerifyDirect(fee.id, false)}
                                    title={t('auto.reject', 'Reject')}
                                  >
                                    <i className="bi bi-x-lg"></i>
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('auto.deleteFeeDefinition', `Delete Fee Definition?`)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '2rem' }}></i>
            <p className="mt-3">
              {t('auto.thisWillPermanentlyRemove', `This will permanently remove`)} <strong>{deleteTarget?.title}</strong> {t('auto.forThisStudent', `for this student.`)}
                                      </p>
            <p className="text-muted small mb-0">{t('auto.thisActionCannotBeUndone', `This action cannot be undone.`)}</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>{t('auto.cancel', `Cancel`)}</Button>
          <Button variant="danger" onClick={confirmDeleteFeeDefinition}>{t('auto.delete', `Delete`)}</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
      <Modal.Title>{t('auto.editFeeDefinition', `Edit Fee Definition`)}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {renderForm(handleUpdateFeeDefinition, true)}
    </Modal.Body>
  </Modal>

      {/* Verify / Reject payment / View Details Modal */}
      <Modal show={!!verifyTarget} onHide={() => setVerifyTarget(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-file-earmark-text me-2"></i>
            {verifyTarget && verifyTarget.status === 'PROCESSING' 
              ? t('auto.verifyPayment', 'Verify Payment') 
              : t('auto.feePaymentDetailsTitle', 'Fee Payment Details')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {verifyTarget && (
            <div>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.feeTitleLabel', 'Fee Title:')}</strong>{' '}
                  <span className="fw-medium">{verifyTarget.title || verifyTarget.feeDefinition?.title || 'N/A'}</span>
                </Col>
                <Col md={6}>
                  <strong>{t('auto.statusLabel', 'Status:')}</strong>{' '}
                  <Badge bg={
                    verifyTarget.status === 'PAID' ? 'success' :
                    verifyTarget.status === 'PROCESSING' ? 'warning' :
                    verifyTarget.status === 'OVERDUE' ? 'danger' : 'secondary'
                  }>
                    {verifyTarget.status}
                  </Badge>
                </Col>
              </Row>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.dueDateLabel', 'Due Date:')}</strong>{' '}
                  {verifyTarget.dueDate ? new Date(verifyTarget.dueDate).toLocaleDateString() : '-'}
                </Col>
                <Col md={6}>
                  <strong>{t('auto.paidDateLabel', 'Submitted/Paid Date:')}</strong>{' '}
                  {verifyTarget.paidDate ? new Date(verifyTarget.paidDate).toLocaleDateString() : '-'}
                </Col>
              </Row>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.amountLabel', 'Expected Amount:')}</strong>{' '}
                  <span className="fw-bold text-success">
                    {getCurrencySymbol(verifyTarget.currency || verifyTarget.feeDefinition?.currency || 'USD')}
                    {(verifyTarget.amount || verifyTarget.feeDefinition?.amount || 0).toFixed(2)}
                  </span>
                </Col>
                <Col md={6}>
                  <strong>{t('auto.paidAmountLabel', 'Paid Amount:')}</strong>{' '}
                  <span className="fw-bold text-success">
                    {verifyTarget.paidAmount !== undefined && verifyTarget.paidAmount !== null ? (
                      `${getCurrencySymbol(verifyTarget.currency || verifyTarget.feeDefinition?.currency || 'USD')}${verifyTarget.paidAmount.toFixed(2)}`
                    ) : (
                      '-'
                    )}
                  </span>
                </Col>
              </Row>
              {verifyTarget.description && (
                <div className="mb-3 border-bottom pb-2">
                  <strong>{t('auto.descriptionLabel', 'Description:')}</strong>
                  <p className="bg-light p-2 rounded mt-1 border" style={{ whiteSpace: 'pre-wrap' }}>
                    {verifyTarget.description}
                  </p>
                </div>
              )}
              <div className="mb-3 border-bottom pb-2">
                <strong>{t('auto.detailsLabel', 'Payment Details/Remarks:')}</strong>
                <p className="bg-light p-2 rounded mt-1 border" style={{ whiteSpace: 'pre-wrap' }}>
                  {verifyTarget.paymentDetails || t('auto.noDetailsSubmitted', 'No details submitted')}
                </p>
              </div>
              <div className="mb-3">
                <strong>{t('auto.paymentProof', 'Payment Proof:')}</strong>
                {verifyTarget.paymentProof ? (
                  <div className="mt-2 border rounded p-2 bg-light text-center">
                    <div className="mb-2">
                      <a
                        href={verifyTarget.paymentProof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-box-arrow-up-right me-1"></i>
                        {t('auto.openInNewTab', 'Open Image in New Tab')}
                      </a>
                    </div>
                    <img
                      src={verifyTarget.paymentProof}
                      alt={t('auto.paymentProofAlt', 'Payment Proof Screenshot')}
                      className="img-fluid rounded border shadow-sm"
                      style={{ maxHeight: '400px', objectFit: 'contain', cursor: 'pointer' }}
                      onClick={() => window.open(verifyTarget.paymentProof, '_blank')}
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
          {verifyTarget && verifyTarget.status === 'PROCESSING' ? (
            <>
              <div className="d-flex gap-2 me-auto">
                <Button variant="success" onClick={() => handleVerify(true)} disabled={verifying}>
                  {verifying ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-check-lg me-1"></i>}
                  {t('auto.approve', 'Approve')}
                </Button>
                <Button variant="danger" onClick={() => handleVerify(false)} disabled={verifying}>
                  {verifying ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-x-lg me-1"></i>}
                  {t('auto.reject', 'Reject')}
                </Button>
              </div>
              <Button variant="secondary" onClick={() => setVerifyTarget(null)} disabled={verifying}>
                {t('auto.cancel', `Cancel`)}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setVerifyTarget(null)}>
              {t('auto.close', 'Close')}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default FeeSubform;
