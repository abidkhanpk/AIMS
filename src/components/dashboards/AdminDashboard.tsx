import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Button, Table, Card, Row, Col, Tabs, Tab, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { Role, FeeStatus, AttendanceStatus } from '@prisma/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  _count?: {
    studentCourses: number;
  };
}

interface Fee {
  id: string;
  title: string;
  description?: string;
  amount: number;
  dueDate: string;
  status: FeeStatus;
  paidDate?: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  paidBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Progress {
  id: string;
  date: string;
  lesson?: string;
  homework?: string;
  lessonProgress?: number;
  score?: number;
  remarks?: string;
  attendance: AttendanceStatus;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    name: string;
  };
  parentRemarks?: Array<{
    id: string;
    remark: string;
    createdAt: string;
    parent: {
      name: string;
    };
  }>;
}

const roleConfig = {
  TEACHER: { icon: 'bi-person-workspace', color: 'success', title: 'Teachers' },
  PARENT: { icon: 'bi-people', color: 'info', title: 'Parents' },
  STUDENT: { icon: 'bi-mortarboard', color: 'warning', title: 'Students' },
  DEVELOPER: { icon: 'bi-code-slash', color: 'secondary', title: 'Developers' },
  ADMIN: { icon: 'bi-gear-fill', color: 'primary', title: 'Admins' }
} as const;

function UserManagementTab({ role }: { role: Role }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const config = roleConfig[role as keyof typeof roleConfig];

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?role=${role}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch users');
        setUsers([]);
      }
    } catch (error) {
      setError('Error fetching users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (res.ok) {
        setSuccess(`${role.toLowerCase()} created successfully!`);
        fetchUsers();
        setName('');
        setEmail('');
        setPassword('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || `Failed to create ${role.toLowerCase()}`);
      }
    } catch (error) {
      setError(`Error creating ${role.toLowerCase()}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className={`bg-${config.color} text-white`}>
              <h6 className="mb-0">
                <i className={`${config.icon} me-2`}></i>
                Create New {role.charAt(0) + role.slice(1).toLowerCase()}
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateUser}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Enter full name"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="Enter email address"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder="Enter password"
                    minLength={6}
                    size="sm"
                  />
                </Form.Group>
                <Button 
                  variant={config.color} 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className={`${config.icon} me-2`}></i>
                  {config.title}
                </h6>
                <Badge bg={config.color}>{users.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2 text-muted small">Loading {config.title.toLowerCase()}...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-4">
                  <i className={`${config.icon} display-6 text-muted`}></i>
                  <p className="mt-2 text-muted small">No {config.title.toLowerCase()} found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="fw-medium">{user.name}</td>
                          <td className="text-muted">{user.email}</td>
                          <td className="text-muted small">
                            {new Date(user.createdAt).toLocaleDateString()}
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
    </div>
  );
}

function SubjectManagementTab() {
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      } else {
        setError('Failed to fetch subjects');
      }
    } catch (error) {
      setError('Error fetching subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/subjects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        setSuccess('Subject created successfully!');
        fetchSubjects();
        setName('');
        setDescription('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create subject');
      }
    } catch (error) {
      setError('Error creating subject');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-book me-2"></i>
                Create New Subject
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateSubject}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Enter subject name"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Description</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter subject description"
                    size="sm"
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Subject
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-book me-2"></i>
                  Subjects
                </h6>
                <Badge bg="primary">{subjects.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2 text-muted small">Loading subjects...</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-book display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No subjects found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Students</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subject) => (
                        <tr key={subject.id}>
                          <td className="fw-medium">{subject.name}</td>
                          <td className="text-muted">
                            {subject.description ? 
                              (subject.description.length > 50 ? 
                                subject.description.substring(0, 50) + '...' : 
                                subject.description
                              ) : 
                              'No description'
                            }
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {subject._count?.studentCourses || 0}
                            </Badge>
                          </td>
                          <td className="text-muted small">
                            {new Date(subject.createdAt).toLocaleDateString()}
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
    </div>
  );
}

function AssignmentsTab() {
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Subject assignment states
  const [selectedStudentForSubject, setSelectedStudentForSubject] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [assigningSubject, setAssigningSubject] = useState(false);

  // Teacher assignment states
  const [selectedStudentForTeacher, setSelectedStudentForTeacher] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [assigningTeacher, setAssigningTeacher] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, teachersRes, subjectsRes] = await Promise.all([
        fetch('/api/users?role=STUDENT'),
        fetch('/api/users?role=TEACHER'),
        fetch('/api/subjects'),
      ]);
      
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
    } catch (error) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssigningSubject(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/assignments/assign-subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: selectedStudentForSubject, 
          courseId: selectedSubject 
        }),
      });

      if (res.ok) {
        setSuccess('Subject assigned successfully!');
        setSelectedStudentForSubject('');
        setSelectedSubject('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to assign subject');
      }
    } catch (error) {
      setError('Error assigning subject');
    } finally {
      setAssigningSubject(false);
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssigningTeacher(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/assignments/assign-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: selectedStudentForTeacher, 
          teacherId: selectedTeacher 
        }),
      });

      if (res.ok) {
        setSuccess('Teacher assigned successfully!');
        setSelectedStudentForTeacher('');
        setSelectedTeacher('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to assign teacher');
      }
    } catch (error) {
      setError('Error assigning teacher');
    } finally {
      setAssigningTeacher(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading assignment data...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={6}>
          <Card className="shadow-sm">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">
                <i className="bi bi-book-half me-2"></i>
                Assign Subject to Student
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleAssignSubject}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Student</Form.Label>
                  <Form.Select 
                    onChange={(e) => setSelectedStudentForSubject(e.target.value)} 
                    value={selectedStudentForSubject}
                    required
                    size="sm"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Select Subject</Form.Label>
                  <Form.Select 
                    onChange={(e) => setSelectedSubject(e.target.value)} 
                    value={selectedSubject}
                    required
                    size="sm"
                  >
                    <option value="">Choose a subject...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Button 
                  type="submit" 
                  variant="info" 
                  disabled={assigningSubject}
                  className="w-100"
                  size="sm"
                >
                  {assigningSubject ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-link me-2"></i>
                      Assign Subject
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="shadow-sm">
            <Card.Header className="bg-success text-white">
              <h6 className="mb-0">
                <i className="bi bi-person-workspace me-2"></i>
                Assign Teacher to Student
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleAssignTeacher}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Student</Form.Label>
                  <Form.Select 
                    onChange={(e) => setSelectedStudentForTeacher(e.target.value)} 
                    value={selectedStudentForTeacher}
                    required
                    size="sm"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Select Teacher</Form.Label>
                  <Form.Select 
                    onChange={(e) => setSelectedTeacher(e.target.value)} 
                    value={selectedTeacher}
                    required
                    size="sm"
                  >
                    <option value="">Choose a teacher...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Button 
                  type="submit" 
                  variant="success" 
                  disabled={assigningTeacher}
                  className="w-100"
                  size="sm"
                >
                  {assigningTeacher ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-link me-2"></i>
                      Assign Teacher
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function FeeManagementTab() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fee creation states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [feeTitle, setFeeTitle] = useState('');
  const [feeDescription, setFeeDescription] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDueDate, setFeeDueDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [feesRes, studentsRes] = await Promise.all([
        fetch('/api/fees'),
        fetch('/api/users?role=STUDENT'),
      ]);
      
      if (feesRes.ok) setFees(await feesRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
    } catch (error) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          title: feeTitle,
          description: feeDescription,
          amount: parseFloat(feeAmount),
          dueDate: feeDueDate,
        }),
      });

      if (res.ok) {
        setSuccess('Fee created successfully!');
        fetchData();
        setSelectedStudent('');
        setFeeTitle('');
        setFeeDescription('');
        setFeeAmount('');
        setFeeDueDate('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create fee');
      }
    } catch (error) {
      setError('Error creating fee');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: FeeStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge bg="success">Paid</Badge>;
      case 'PENDING':
        return <Badge bg="warning">Pending</Badge>;
      case 'OVERDUE':
        return <Badge bg="danger">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-warning text-dark">
              <h6 className="mb-0">
                <i className="bi bi-cash-coin me-2"></i>
                Create New Fee
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateFee}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Student</Form.Label>
                  <Form.Select 
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Fee Title</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={feeTitle} 
                    onChange={(e) => setFeeTitle(e.target.value)} 
                    required 
                    placeholder="e.g., Tuition Fee"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={2} 
                    value={feeDescription} 
                    onChange={(e) => setFeeDescription(e.target.value)}
                    placeholder="Optional description"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Amount ($)</Form.Label>
                  <Form.Control 
                    type="number" 
                    step="0.01"
                    value={feeAmount} 
                    onChange={(e) => setFeeAmount(e.target.value)} 
                    required 
                    placeholder="0.00"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={feeDueDate} 
                    onChange={(e) => setFeeDueDate(e.target.value)} 
                    required 
                    size="sm"
                  />
                </Form.Group>
                <Button 
                  variant="warning" 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Fee
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-cash-coin me-2"></i>
                  Fee Management
                </h6>
                <Badge bg="warning">{fees.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2 text-muted small">Loading fees...</p>
                </div>
              ) : fees.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-cash-coin display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No fees found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Student</th>
                        <th>Title</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Paid By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((fee) => (
                        <tr key={fee.id}>
                          <td className="fw-medium">{fee.student.name}</td>
                          <td>{fee.title}</td>
                          <td className="fw-bold text-success">${fee.amount.toFixed(2)}</td>
                          <td className="text-muted small">
                            {new Date(fee.dueDate).toLocaleDateString()}
                          </td>
                          <td>{getStatusBadge(fee.status)}</td>
                          <td className="text-muted small">
                            {fee.paidBy ? fee.paidBy.name : '-'}
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
    </div>
  );
}

function ProgressOverviewTab() {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/progress');
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      } else {
        setError('Failed to fetch progress data');
      }
    } catch (error) {
      setError('Error fetching progress data');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceBadge = (attendance: AttendanceStatus) => {
    switch (attendance) {
      case 'PRESENT':
        return <Badge bg="success">Present</Badge>;
      case 'ABSENT':
        return <Badge bg="danger">Absent</Badge>;
      case 'LATE':
        return <Badge bg="warning">Late</Badge>;
      case 'EXCUSED':
        return <Badge bg="info">Excused</Badge>;
      default:
        return <Badge bg="secondary">{attendance}</Badge>;
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Student Progress Overview
            </h6>
            <Badge bg="info">{progress.length} Records</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading progress data...</p>
            </div>
          ) : progress.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-graph-up display-6 text-muted"></i>
              <p className="mt-2 text-muted small">No progress records found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Teacher</th>
                    <th>Lesson</th>
                    <th>Progress</th>
                    <th>Score</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((record) => (
                    <tr key={record.id}>
                      <td className="text-muted small">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="fw-medium">{record.student.name}</td>
                      <td>{record.course.name}</td>
                      <td className="text-muted">{record.teacher.name}</td>
                      <td>{record.lesson || '-'}</td>
                      <td>
                        {record.lessonProgress ? (
                          <Badge bg="primary">{record.lessonProgress}%</Badge>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {record.score ? (
                          <Badge bg="success">{record.score}</Badge>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{getAttendanceBadge(record.attendance)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">
            <i className="bi bi-speedometer2 me-2 text-primary"></i>
            Admin Dashboard
          </h1>
          <p className="text-muted">Manage users, subjects, assignments, fees, and monitor progress</p>
        </div>
      </div>

      <Tabs defaultActiveKey="teachers" id="admin-dashboard-tabs" className="mb-4">
        <Tab 
          eventKey="teachers" 
          title={
            <span>
              <i className="bi bi-person-workspace me-2"></i>
              Teachers
            </span>
          }
        >
          <UserManagementTab role={Role.TEACHER} />
        </Tab>
        <Tab 
          eventKey="parents" 
          title={
            <span>
              <i className="bi bi-people me-2"></i>
              Parents
            </span>
          }
        >
          <UserManagementTab role={Role.PARENT} />
        </Tab>
        <Tab 
          eventKey="students" 
          title={
            <span>
              <i className="bi bi-mortarboard me-2"></i>
              Students
            </span>
          }
        >
          <UserManagementTab role={Role.STUDENT} />
        </Tab>
        <Tab 
          eventKey="subjects" 
          title={
            <span>
              <i className="bi bi-book me-2"></i>
              Subjects
            </span>
          }
        >
          <SubjectManagementTab />
        </Tab>
        <Tab 
          eventKey="assignments" 
          title={
            <span>
              <i className="bi bi-diagram-3 me-2"></i>
              Assignments
            </span>
          }
        >
          <AssignmentsTab />
        </Tab>
        <Tab 
          eventKey="fees" 
          title={
            <span>
              <i className="bi bi-cash-coin me-2"></i>
              Fees
            </span>
          }
        >
          <FeeManagementTab />
        </Tab>
        <Tab 
          eventKey="progress" 
          title={
            <span>
              <i className="bi bi-graph-up me-2"></i>
              Progress
            </span>
          }
        >
          <ProgressOverviewTab />
        </Tab>
      </Tabs>
    </div>
  );
}