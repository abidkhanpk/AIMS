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

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
];

function FeeSubform({ studentId, onFeeChange }: { studentId: string; onFeeChange: () => void; }) {
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
        <Form.Label>Title</Form.Label>
        <Form.Control type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Description</Form.Label>
        <Form.Control as="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Form.Group>
      <Row>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Amount</Form.Label>
            <Form.Control type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Currency</Form.Label>
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
        <Form.Label>Type</Form.Label>
        <Form.Select value={type} onChange={(e) => setType(e.target.value as FeeType)} required>
          {feeTypes.map((feeType) => (
            <option key={feeType} value={feeType}>{feeType}</option>
          ))}
        </Form.Select>
      </Form.Group>
      <Row>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Generation Day</Form.Label>
            <Form.Control type="number" value={generationDay} onChange={(e) => setGenerationDay(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col>
          <Form.Group className="mb-3">
            <Form.Label>Start Date</Form.Label>
            <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>Due Date After (Days)</Form.Label>
        <Form.Control type="number" value={dueAfterDays} onChange={(e) => setDueAfterDays(e.target.value)} required />
        <Form.Text className="text-muted">Date after these number of days after generation day is set as due date.</Form.Text>
      </Form.Group>
      <Button variant="primary" type="submit" disabled={isEditing ? editing : creating} className="w-100">
        {isEditing ? (editing ? 'Updating...' : 'Update Fee Definition') : (creating ? 'Creating...' : 'Create Fee Definition')}
      </Button>
    </Form>
  );

  const handleVerify = async (approve: boolean) => {
    if (!verifyTarget) return;
    setVerifying(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/fees/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId: verifyTarget.id, approve }),
      });
      if (res.ok) {
        setSuccess(approve ? 'Payment verified' : 'Payment rejected');
        setVerifyTarget(null);
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
                <Nav.Link eventKey="definitions">Fee Definitions <Badge bg="primary">{feeDefinitions.length}</Badge></Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="payments">Fee Payments</Nav.Link>
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
                          <Form.Label>Title</Form.Label>
                          <Form.Control type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Amount</Form.Label>
                          <Form.Control type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Currency</Form.Label>
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
                          <Form.Label>Type</Form.Label>
                          <Form.Select value={type} onChange={(e) => setType(e.target.value as FeeType)} required>
                            {feeTypes.map((feeType) => (
                              <option key={feeType} value={feeType}>{feeType}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Generation Day</Form.Label>
                          <Form.Control type="number" value={generationDay} onChange={(e) => setGenerationDay(e.target.value)} required />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Start Date</Form.Label>
                          <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Due Date After (Days)</Form.Label>
                          <Form.Control type="number" value={dueAfterDays} onChange={(e) => setDueAfterDays(e.target.value)} required />
                          <Form.Text className="text-muted">Date after these number of days after generation day is set as due date.</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label>Description</Form.Label>
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
                        Cancel
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
                    <p className="mt-2 text-muted small">Loading fee definitions...</p>
                  </div>
                ) : feeDefinitions.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-list-task display-6 text-muted"></i>
                    <p className="mt-2 text-muted small">No fee definitions found</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Title</th>
                          <th>Amount</th>
                          <th>Type</th>
                          <th>Actions</th>
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
                                title="Edit Fee Definition"
                                className="me-2"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => askDeleteFeeDefinition(fd)}
                                title="Delete Fee Definition"
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
                    <p className="mt-2 text-muted small">Loading payments...</p>
                  </div>
                ) : feePayments.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-receipt-cutoff display-6 text-muted"></i>
                    <p className="mt-2 text-muted small">No fee payments found</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Title</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Paid Date</th>
                          <th>Actions</th>
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
                              {fee.status === FeeStatus.PROCESSING ? (
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => setVerifyTarget(fee)}
                                >
                                  Verify/Reject
                                </Button>
                              ) : (
                                <span className="text-muted small">-</span>
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
          <Modal.Title>Delete Fee Definition?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '2rem' }}></i>
            <p className="mt-3">
              This will permanently remove <strong>{deleteTarget?.title}</strong> for this student.
            </p>
            <p className="text-muted small mb-0">This action cannot be undone.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteFeeDefinition}>Delete</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
      <Modal.Title>Edit Fee Definition</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {renderForm(handleUpdateFeeDefinition, true)}
    </Modal.Body>
  </Modal>

      {/* Verify / Reject payment */}
      <Modal show={!!verifyTarget} onHide={() => setVerifyTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Verify Payment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {verifyTarget && (
            <>
              <p className="mb-1"><strong>Fee:</strong> {verifyTarget.feeDefinition?.title || verifyTarget.title}</p>
              <p className="mb-1"><strong>Amount:</strong> {verifyTarget.feeDefinition?.amount || verifyTarget.amount} {verifyTarget.feeDefinition?.currency || verifyTarget.currency}</p>
              <p className="mb-0 text-muted small">Approve to mark as paid, or reject to send it back to pending.</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setVerifyTarget(null)} disabled={verifying}>Cancel</Button>
          <Button variant="danger" onClick={() => handleVerify(false)} disabled={verifying}>
            {verifying ? 'Rejecting...' : 'Reject'}
          </Button>
          <Button variant="success" onClick={() => handleVerify(true)} disabled={verifying}>
            {verifying ? 'Verifying...' : 'Verify'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default FeeSubform;
