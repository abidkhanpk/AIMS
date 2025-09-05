import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Table, Card, Row, Col, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { FeeType } from '@prisma/client';

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

  useEffect(() => {
    if (studentId) {
      fetchFees();
    }
  }, [studentId, fetchFees]);

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
            <Form.Control type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} required />
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
        <Form.Label>Due After (Days)</Form.Label>
        <Form.Control type="number" value={dueAfterDays} onChange={(e) => setDueAfterDays(e.target.value)} required />
        <Form.Text className="text-muted">Number of days after generation day when the fee becomes due.</Form.Text>
      </Form.Group>
      <Button variant="primary" type="submit" disabled={isEditing ? editing : creating} className="w-100">
        {isEditing ? (editing ? 'Updating...' : 'Update Fee Definition') : (creating ? 'Creating...' : 'Create Fee Definition')}
      </Button>
    </Form>
  );

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-3">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Create Fee Definition
              </h6>
            </Card.Header>
            <Card.Body>
              {renderForm(handleCreateFeeDefinition)}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-list-task me-2"></i>
                  Fee Definitions
                </h6>
                <Badge bg="primary">{feeDefinitions.length}</Badge>
              </div>
            </Card.Header>
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
          </Card>
        </Col>
      </Row>

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
    </div>
  );
}

export default FeeSubform;
