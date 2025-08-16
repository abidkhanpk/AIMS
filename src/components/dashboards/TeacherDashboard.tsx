import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Form, Button, Modal, Alert, Spinner } from 'react-bootstrap';

interface Student {
  id: string;
  name: string;
  email: string;
  studentCourses: {
    course: {
      id: string;
      name: string;
      description: string;
    };
  }[];
  progressRecords: {
    id: string;
    text: string;
    percent: number;
    createdAt: string;
    course: {
      id: string;
      name: string;
    };
  }[];
}

export default function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Progress update modal states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState('');
  const [updatingProgress, setUpdatingProgress] = useState(false);

  useEffect(() => {
    fetchAssignedStudents();
  }, []);

  const fetchAssignedStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/assigned-students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      } else {
        setError('Failed to fetch assigned students');
      }
    } catch (error) {
      setError('Error fetching assigned students');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = (student: Student) => {
    setSelectedStudent(student);
    setSelectedCourse('');
    setProgressText('');
    setProgressPercent('');
    setShowProgressModal(true);
  };

  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedCourse) return;

    setUpdatingProgress(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          courseId: selectedCourse,
          text: progressText || null,
          percent: progressPercent ? parseFloat(progressPercent) : null,
        }),
      });

      if (res.ok) {
        setSuccess('Progress updated successfully!');
        setShowProgressModal(false);
        fetchAssignedStudents(); // Refresh data
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update progress');
      }
    } catch (error) {
      setError('Error updating progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const getLatestProgress = (student: Student, courseId: string) => {
    const courseProgress = student.progressRecords.filter(p => p.course.id === courseId);
    return courseProgress.length > 0 ? courseProgress[0] : null;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading your assigned students...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">
            <i className="bi bi-person-workspace me-2 text-success"></i>
            Teacher Dashboard
          </h1>
          <p className="text-muted">Manage your assigned students and track their progress</p>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {students.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-people display-4 text-muted"></i>
            <h4 className="mt-3 text-muted">No Students Assigned</h4>
            <p className="text-muted">You don't have any students assigned to you yet. Please contact your administrator.</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {students.map((student) => (
            <Col key={student.id} lg={6} xl={4}>
              <Card className="h-100 shadow-sm">
                <Card.Header className="bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0 fw-bold">{student.name}</h6>
                      <small className="text-muted">{student.email}</small>
                    </div>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleUpdateProgress(student)}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Update Progress
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body className="p-0">
                  {student.studentCourses.length === 0 ? (
                    <div className="text-center py-3">
                      <small className="text-muted">No subjects assigned</small>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table size="sm" className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Subject</th>
                            <th>Progress</th>
                            <th>Last Update</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student.studentCourses.map(({ course }) => {
                            const latestProgress = getLatestProgress(student, course.id);
                            return (
                              <tr key={course.id}>
                                <td className="fw-medium">{course.name}</td>
                                <td>
                                  {latestProgress ? (
                                    <div>
                                      {latestProgress.percent !== null && (
                                        <Badge bg="primary" className="me-1">
                                          {latestProgress.percent}%
                                        </Badge>
                                      )}
                                      {latestProgress.text && (
                                        <small className="text-muted d-block">
                                          {latestProgress.text.length > 30 
                                            ? latestProgress.text.substring(0, 30) + '...'
                                            : latestProgress.text
                                          }
                                        </small>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge bg="secondary">No progress</Badge>
                                  )}
                                </td>
                                <td>
                                  {latestProgress ? (
                                    <small className="text-muted">
                                      {new Date(latestProgress.createdAt).toLocaleDateString()}
                                    </small>
                                  ) : (
                                    <small className="text-muted">-</small>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Progress Update Modal */}
      <Modal show={showProgressModal} onHide={() => setShowProgressModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-graph-up me-2"></i>
            Update Progress for {selectedStudent?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitProgress}>
            <Form.Group className="mb-3">
              <Form.Label>Select Subject</Form.Label>
              <Form.Select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                required
              >
                <option value="">Choose a subject...</option>
                {selectedStudent?.studentCourses.map(({ course }) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Progress Percentage (Optional)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={progressPercent}
                    onChange={(e) => setProgressPercent(e.target.value)}
                    placeholder="Enter percentage (0-100)"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Progress Notes (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={progressText}
                    onChange={(e) => setProgressText(e.target.value)}
                    placeholder="Enter progress notes..."
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowProgressModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={updatingProgress || (!progressText && !progressPercent)}
              >
                {updatingProgress ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Update Progress
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}