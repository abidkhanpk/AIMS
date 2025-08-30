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

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [type, setType] = useState<FeeType>('MONTHLY');
  const [generationDay, setGenerationDay] = useState('1');
  const [startDate, setStartDate] = useState('');
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
          studentIds,
        }),
      });

      if (res.ok) {
        setSuccess('Fee definition created successfully!');
        fetchFeeDefinitions();
        resetForm();
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
    setStudentIds([]);
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
      <Button variant="primary" type="submit" disabled={isEditing ? editing : creating} className="w-100">
        {isEditing ? (editing ? 'Updating...' : 'Update Fee Definition') : (creating ? 'Creating...' : 'Create Fee Definition')}
      </Button>
    </Form>
  );

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
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

        <Col lg={8}>
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
        </Col>
      </Row>

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