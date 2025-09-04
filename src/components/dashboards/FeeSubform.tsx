import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Table, Card, Row, Col, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { FeeType } from '@prisma/client';

interface FeeDefinition {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  type: FeeType;
  generationDay: number;
  startDate: string;
  studentFeeDefinitions?: { student?: { id: string } }[]; // added for filtering
}

const feeTypes = Object.values(FeeType);

function FeeSubform({ studentId, onFeeChange }: { studentId: string; onFeeChange: () => void; }) {
  const [feeDefinitions, setFeeDefinitions] = useState<FeeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFeeDefinition, setEditingFeeDefinition] = useState<FeeDefinition | null>(null);
  const [editing, setEditing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [type, setType] = useState<FeeType>('MONTHLY');
  const [generationDay, setGenerationDay] = useState('1');
  const [startDate, setStartDate] = useState('');

  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/fees/definitions`);
      if (res.ok) {
        const data: FeeDefinition[] = await res.json();
        // filter only those linked to this student
        setFeeDefinitions(
          Array.isArray(data)
            ? data.filter(fd =>
                fd.studentFeeDefinitions?.some(s => s.student?.id === studentId)
              )
            : []
        );
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
          generationDay: parseInt(generationDay),
          startDate,
          studentIds: [studentId],
        }),
      });

      if (res.ok) {
        setSuccess('Fee definition created successfully!');
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

  const handleDeleteFeeDefinition = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee definition?')) return;

    try {
      const res = await fetch(`/api/fees/definitions/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess('Fee deleted successfully!');
        fetchFees();
        onFeeChange();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to delete fee');
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
          generationDay: parseInt(generationDay),
          startDate,
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
    } catch (err) {
      setError('Error updating fee definition');
    } finally {
      setEditing(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setCurrency('USD');
    setType('MONTHLY');
    setGenerationDay('1');
    setStartDate('');
  };

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
              <Form onSubmit={handleCreateFeeDefinition}>
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
                <Button variant="primary" type="submit" disabled={creating} className="w-100">
                  {creating ? 'Creating...' : 'Create Fee Definition'}
                </Button>
              </Form>
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
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="ms-2"
                              onClick={() => handleDeleteFeeDefinition(fd.id)}
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

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Fee Definition</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateFeeDefinition}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amount</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    required
                  >
                    <option value="USD">USD</option>
                    <option value="PKR">PKR</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Select value={type} onChange={(e) => setType(e.target.value as FeeType)} required>
                    <option value="MONTHLY">Monthly</option>
                    <option value="BIMONTHLY">Bi-monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALFYEARLY">Half-yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Generation Day (1-28)</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    max={28}
                    value={generationDay}
                    onChange={(e) => setGenerationDay(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={editing}>
                {editing ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" /> Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default FeeSubform;
