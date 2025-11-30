import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Table, Card, Row, Col, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { FeeType, FeeStatus } from '@prisma/client';

// TODO: These interfaces should be in a central types file
interface FeeDefinition {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  type: FeeType;
  generationDay: number;
  startDate: string;
  dueAfterDays?: number;
  studentFeeDefinitions: { student: { id: string; name: string; } }[];
}

interface Student {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
}

const feeTypes = Object.values(FeeType);

const FeeManagementTab = () => {
  const [feeDefinitions, setFeeDefinitions] = useState<FeeDefinition[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [type, setType] = useState<FeeType>('MONTHLY');
  const [generationDay, setGenerationDay] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [dueAfterDays, setDueAfterDays] = useState('7');
  const [studentIds, setStudentIds] = useState<string[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFeeDefinition, setEditingFeeDefinition] = useState<FeeDefinition | null>(null);

  const fetchFeeDefinitions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fees/definitions');
      if (res.ok) {
        const data = await res.json();
        setFeeDefinitions(Array.isArray(data) ? data : []);
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
  }, []);

  const fetchRequiredData = useCallback(async () => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        fetch('/api/users?role=STUDENT'),
        fetch('/api/subjects'),
      ]);
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (coursesRes.ok) setCourses(await coursesRes.json());
    } catch (error) {
      setError('Error fetching required data');
    }
  }, []);

  useEffect(() => {
    fetchFeeDefinitions();
    fetchRequiredData();
  }, [fetchFeeDefinitions, fetchRequiredData]);

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
          dueAfterDays: parseInt(dueAfterDays),
          studentIds,
        }),
      });

      if (res.ok) {
        setSuccess('Fee definition created successfully!');
        fetchFeeDefinitions();
        resetForm();
        setShowCreateForm(false);
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

  const handleEditFeeDefinition = (feeDefinition: FeeDefinition) => {
    setEditingFeeDefinition(feeDefinition);
    setTitle(feeDefinition.title);
    setDescription(feeDefinition.description || '');
    setAmount(feeDefinition.amount.toString());
    setCurrency(feeDefinition.currency);
    setType(feeDefinition.type);
    setGenerationDay(feeDefinition.generationDay.toString());
    setStartDate(new Date(feeDefinition.startDate).toISOString().split('T')[0]);
    setDueAfterDays((feeDefinition.dueAfterDays ?? 7).toString());
    setStudentIds(feeDefinition.studentFeeDefinitions.map(sfd => sfd.student.id));
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
          dueAfterDays: parseInt(dueAfterDays),
          studentIds,
        }),
      });

      if (res.ok) {
        setSuccess('Fee definition updated successfully!');
        fetchFeeDefinitions();
        setShowEditModal(false);
        setEditingFeeDefinition(null);
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

  const handleDeleteFeeDefinition = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee definition?')) return;

    try {
      const res = await fetch(`/api/fees/definitions/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess('Fee definition deleted successfully!');
        fetchFeeDefinitions();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to delete fee definition');
      }
    } catch (error) {
      setError('Error deleting fee definition');
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
    setDueAfterDays('7');
    setStudentIds([]);
  };

  const renderForm = (handleSubmit: (e: React.FormEvent) => void, isEditing = false, onCancel?: () => void) => (
    <Form onSubmit={handleSubmit}>
      <Row className="g-3">
        <Col md={4}>
          <Form.Group className="mb-0">
            <Form.Label>Title</Form.Label>
            <Form.Control type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-0">
            <Form.Label>Type</Form.Label>
            <Form.Select value={type} onChange={(e) => setType(e.target.value as FeeType)} required>
              {feeTypes.map((feeType) => (
                <option key={feeType} value={feeType}>{feeType}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-0">
            <Form.Label>Currency</Form.Label>
            <Form.Select value={currency} onChange={(e) => setCurrency(e.target.value)} required>
              <option value="USD">$ US Dollar (USD)</option>
              <option value="EUR">€ Euro (EUR)</option>
              <option value="GBP">£ British Pound (GBP)</option>
              <option value="JPY">¥ Japanese Yen (JPY)</option>
              <option value="CAD">C$ Canadian Dollar (CAD)</option>
              <option value="AUD">A$ Australian Dollar (AUD)</option>
              <option value="CHF">CHF Swiss Franc (CHF)</option>
              <option value="CNY">¥ Chinese Yuan (CNY)</option>
              <option value="INR">₹ Indian Rupee (INR)</option>
              <option value="PKR">₨ Pakistani Rupee (PKR)</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-0">
            <Form.Label>Amount</Form.Label>
            <Form.Control type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-0">
            <Form.Label>Generation Day</Form.Label>
            <Form.Control type="number" value={generationDay} onChange={(e) => setGenerationDay(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-0">
            <Form.Label>Due After (Days)</Form.Label>
            <Form.Control type="number" value={dueAfterDays} onChange={(e) => setDueAfterDays(e.target.value)} required />
            <Form.Text className="text-muted">Days after generation when fee is due.</Form.Text>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-0">
            <Form.Label>Start Date</Form.Label>
            <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col md={8}>
          <Form.Group className="mb-0">
            <Form.Label>Description</Form.Label>
            <Form.Control as="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Form.Group>
        </Col>
        <Col md={12}>
          <Form.Group className="mb-0">
            <Form.Label>Students</Form.Label>
            <Form.Control
              as="select"
              multiple
              value={studentIds}
              onChange={(e) => setStudentIds(Array.from((e.target as unknown as HTMLSelectElement).selectedOptions, option => option.value))}
              required
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
      </Row>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <Button
          variant="secondary"
          type="button"
          size="sm"
          onClick={() => {
            resetForm();
            onCancel?.();
          }}
        >
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isEditing ? editing : creating} size="sm">
          {isEditing ? (editing ? 'Updating...' : 'Update Fee Definition') : (creating ? 'Creating...' : 'Create Fee Definition')}
        </Button>
      </div>
    </Form>
  );

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-list-ul text-primary"></i>
          <h6 className="mb-0">Fee Definitions</h6>
          <Badge bg="primary">{feeDefinitions.length}</Badge>
        </div>
        <Button
          size="sm"
          variant={showCreateForm ? 'secondary' : 'primary'}
          onClick={() => setShowCreateForm((v) => !v)}
        >
          {showCreateForm ? 'Hide Form' : 'Add New Fee Definition'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="shadow-sm mb-3">
          <Card.Header className="bg-primary text-white">
            <h6 className="mb-0">
              <i className="bi bi-plus-circle me-2"></i>
              Create Fee Definition
            </h6>
          </Card.Header>
          <Card.Body>
            {renderForm(handleCreateFeeDefinition, false, () => setShowCreateForm(false))}
          </Card.Body>
        </Card>
      )}

      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <h6 className="mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Fee Definitions
          </h6>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading fee definitions...</p>
            </div>
          ) : feeDefinitions.length === 0 ? (
            <div className="text-center py-4">
              <p className="mt-2 text-muted small">No fee definitions found</p>
            </div>
          ) : (
            <Table hover size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeDefinitions.map((fd) => (
                  <tr key={fd.id}>
                    <td>{fd.title}</td>
                    <td>
                      {fd.studentFeeDefinitions.map(sfd => (
                        <Badge key={sfd.student.id} bg="info" className="me-1">{sfd.student.name}</Badge>
                      ))}
                    </td>
                    <td>{fd.amount} {fd.currency}</td>
                    <td>{fd.type}</td>
                    <td>
                      <Button variant="outline-warning" size="sm" onClick={() => handleEditFeeDefinition(fd)}>
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button variant="outline-danger" size="sm" className="ms-2" onClick={() => handleDeleteFeeDefinition(fd.id)}>
                        <i className="bi bi-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Edit Fee Definition Modal */}
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
};

export default FeeManagementTab;
