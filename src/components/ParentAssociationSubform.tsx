import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Table, Card, Row, Col, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { RelationType } from '@prisma/client';

interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  profession?: string;
  createdAt: string;
}

interface ParentAssociation {
  id: string;
  parentId: string;
  studentId: string;
  relationType: RelationType;
  createdAt: string;
  updatedAt: string;
  parent: User;
}

interface ParentAssociationSubformProps {
  studentId: string;
  onAssociationChange: () => void;
}

const relationTypeOptions = [
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'STEPFATHER', label: 'Stepfather' },
  { value: 'STEPMOTHER', label: 'Stepmother' },
  { value: 'GRANDFATHER', label: 'Grandfather' },
  { value: 'GRANDMOTHER', label: 'Grandmother' },
  { value: 'UNCLE', label: 'Uncle' },
  { value: 'AUNT', label: 'Aunt' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'OTHER', label: 'Other' },
];

const getRelationTypeLabel = (relationType: RelationType) => {
  const option = relationTypeOptions.find(opt => opt.value === relationType);
  return option ? option.label : relationType;
};

const getRelationTypeBadgeColor = (relationType: RelationType) => {
  switch (relationType) {
    case 'FATHER':
    case 'MOTHER':
      return 'primary';
    case 'GUARDIAN':
      return 'success';
    case 'STEPFATHER':
    case 'STEPMOTHER':
      return 'info';
    case 'GRANDFATHER':
    case 'GRANDMOTHER':
      return 'secondary';
    case 'UNCLE':
    case 'AUNT':
      return 'warning';
    case 'SIBLING':
      return 'light';
    default:
      return 'dark';
  }
};

export default function ParentAssociationSubform({ studentId, onAssociationChange }: ParentAssociationSubformProps) {
  const [parents, setParents] = useState<User[]>([]);
  const [associations, setAssociations] = useState<ParentAssociation[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [selectedParent, setSelectedParent] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('GUARDIAN');

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState<ParentAssociation | null>(null);
  const [editRelationType, setEditRelationType] = useState<RelationType>('GUARDIAN');
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [parentsRes, associationsRes] = await Promise.all([
        fetch('/api/users?role=PARENT'),
        fetch(`/api/users/parent-associations?studentId=${studentId}`),
      ]);
      
      if (parentsRes.ok) {
        const parentsData = await parentsRes.json();
        setParents(parentsData);
      } else {
        setError('Failed to fetch parents');
      }

      if (associationsRes.ok) {
        const associationsData = await associationsRes.json();
        setAssociations(associationsData);
      } else {
        setError('Failed to fetch parent associations');
      }
    } catch (error) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId, fetchData]);

  const handleCreateAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users/parent-associations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          parentId: selectedParent,
          relationType,
        }),
      });

      if (res.ok) {
        setSuccess('Parent association created successfully!');
        fetchData();
        onAssociationChange();
        setSelectedParent('');
        setRelationType('GUARDIAN');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create parent association');
      }
    } catch (error) {
      setError('Error creating parent association');
    } finally {
      setCreating(false);
    }
  };

  const handleEditAssociation = (association: ParentAssociation) => {
    setEditingAssociation(association);
    setEditRelationType(association.relationType);
    setShowEditModal(true);
  };

  const handleUpdateAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssociation) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users/parent-associations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          associationId: editingAssociation.id,
          relationType: editRelationType,
        }),
      });

      if (res.ok) {
        setSuccess('Parent association updated successfully!');
        fetchData();
        onAssociationChange();
        setShowEditModal(false);
        setEditingAssociation(null);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update parent association');
      }
    } catch (error) {
      setError('Error updating parent association');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAssociation = async (associationId: string) => {
    if (!confirm('Are you sure you want to remove this parent association?')) return;

    try {
      const res = await fetch('/api/users/parent-associations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ associationId }),
      });

      if (res.ok) {
        setSuccess('Parent association removed successfully!');
        fetchData();
        onAssociationChange();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to remove parent association');
      }
    } catch (error) {
      setError('Error removing parent association');
    }
  };

  // Filter out already associated parents
  const availableParents = parents.filter(parent => 
    !associations.some(assoc => assoc.parent.id === parent.id)
  );

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
        <p className="mt-2 text-muted small">Loading parent associations...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-3">
        <Col lg={5}>
          <Card className="h-100">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">
                <i className="bi bi-person-plus me-2"></i>
                Add Parent Association
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateAssociation}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Parent *</Form.Label>
                  <Form.Select 
                    value={selectedParent}
                    onChange={(e) => setSelectedParent(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a parent...</option>
                    {availableParents.map(parent => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name} ({parent.email})
                      </option>
                    ))}
                  </Form.Select>
                  {availableParents.length === 0 && (
                    <Form.Text className="text-muted">
                      All available parents are already associated with this student.
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Relation Type *</Form.Label>
                  <Form.Select 
                    value={relationType}
                    onChange={(e) => setRelationType(e.target.value as RelationType)}
                    required
                    size="sm"
                  >
                    {relationTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Button 
                  variant="info" 
                  type="submit" 
                  disabled={creating || availableParents.length === 0}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-plus me-2"></i>
                      Add Association
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="h-100">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-people me-2"></i>
                  Associated Parents
                </h6>
                <Badge bg="info">{associations.length}</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {associations.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-people display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No parent associations found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Parent Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Relation</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {associations.map((association) => (
                        <tr key={association.id}>
                          <td className="fw-medium">{association.parent.name}</td>
                          <td className="text-muted">{association.parent.email}</td>
                          <td className="text-muted">{association.parent.mobile || '-'}</td>
                          <td>
                            <Badge bg={getRelationTypeBadgeColor(association.relationType)}>
                              {getRelationTypeLabel(association.relationType)}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditAssociation(association)}
                                title="Edit Relation"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteAssociation(association.id)}
                                title="Remove Association"
                              >
                                <i className="bi bi-person-dash"></i>
                              </Button>
                            </div>
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

      {/* Edit Association Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Edit Parent Relation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingAssociation && (
            <Form onSubmit={handleUpdateAssociation}>
              <div className="mb-3">
                <strong>Parent:</strong> {editingAssociation.parent.name}
              </div>
              <Form.Group className="mb-4">
                <Form.Label>Relation Type *</Form.Label>
                <Form.Select 
                  value={editRelationType}
                  onChange={(e) => setEditRelationType(e.target.value as RelationType)}
                  required
                >
                  {relationTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="warning"
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Update
                    </>
                  )}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
