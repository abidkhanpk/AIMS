import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Form, Button, Modal, Alert, Spinner } from 'react-bootstrap';
import { AttendanceStatus } from '@prisma/client';

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
    date: string;
    lesson: string;
    homework: string;
    lessonProgress: number;
    score: number;
    remarks: string;
    attendance: AttendanceStatus;
    createdAt: string;
    course: {
      id: string;
      name: string;
    };
    parentRemarks: {
      id: string;
      remark: string;
      createdAt: string;
      parent: {
        name: string;
      };
    }[];
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
  const [progressDate, setProgressDate] = useState(new Date().toISOString().split('T')[0]);
  const [lesson, setLesson] = useState('');
  const [homework, setHomework] = useState('');
  const [lessonProgress, setLessonProgress] = useState('');
  const [score, setScore] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStatus>('PRESENT');
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
        setStudents(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch assigned students');
        setStudents([]);
      }
    } catch (error) {
      setError('Error fetching assigned students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = (student: Student) => {
    setSelectedStudent(student);
    setSelectedCourse('');
    setProgressDate(new Date().toISOString().split('T')[0]);
    setLesson('');
    setHomework('');
    setLessonProgress('');
    setScore('');
    setRemarks('');
    setAttendance('PRESENT');
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
          date: progressDate,
          lesson: lesson || null,
          homework: homework || null,
          lessonProgress: lessonProgress ? parseFloat(lessonProgress) : null,
          score: score ? parseFloat(score) : null,
          remarks: remarks || null,
          attendance: attendance,
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
          <p className="text-muted">Manage your assigned students, track their progress, and record attendance</p>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {!students || students.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-people display-4 text-muted"></i>
            <h4 className="mt-3 text-muted">No Students Assigned</h4>
            <p className="text-muted">You don&apos;t have any students assigned to you yet. Please contact your administrator.</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {students.map((student) => (
            <Col key={student.id} xl={12}>
              <Card className="shadow-sm">
                <Card.Header className="bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-0 fw-bold">{student.name}</h5>
                      <small className="text-muted">{student.email}</small>
                    </div>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleUpdateProgress(student)}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Add Progress & Attendance
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body className="p-0">
                  {!student.studentCourses || student.studentCourses.length === 0 ? (
                    <div className="text-center py-3">
                      <small className="text-muted">No subjects assigned</small>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Course</th>
                            <th>Attendance</th>
                            <th>Lesson</th>
                            <th>Homework</th>
                            <th>Progress %</th>
                            <th>Score</th>
                            <th>Remarks</th>
                            <th>Parent Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!student.progressRecords || student.progressRecords.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-3 text-muted">
                                No progress records yet
                              </td>
                            </tr>
                          ) : (
                            student.progressRecords.map((progress) => (
                              <tr key={progress.id}>
                                <td className="small">
                                  {new Date(progress.date).toLocaleDateString()}
                                </td>
                                <td className="fw-medium small">
                                  {progress.course.name}
                                </td>
                                <td>
                                  {getAttendanceBadge(progress.attendance)}
                                </td>
                                <td className="small">
                                  {progress.lesson || '-'}
                                </td>
                                <td className="small">
                                  {progress.homework || '-'}
                                </td>
                                <td>
                                  {progress.lessonProgress !== null ? (
                                    <Badge bg="primary">
                                      {progress.lessonProgress}%
                                    </Badge>
                                  ) : (
                                    <span className="text-muted small">-</span>
                                  )}
                                </td>
                                <td>
                                  {progress.score !== null ? (
                                    <Badge bg="success">
                                      {progress.score}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted small">-</span>
                                  )}
                                </td>
                                <td className="small">
                                  {progress.remarks ? (
                                    progress.remarks.length > 30 
                                      ? progress.remarks.substring(0, 30) + '...'
                                      : progress.remarks
                                  ) : '-'}
                                </td>
                                <td className="small">
                                  {progress.parentRemarks && progress.parentRemarks.length > 0 ? (
                                    <div>
                                      {progress.parentRemarks.map((remark, idx) => (
                                        <div key={remark.id} className="mb-1">
                                          <Badge bg="info" className="me-1">
                                            {remark.parent.name}
                                          </Badge>
                                          <small className="text-muted">
                                            {remark.remark.length > 20 
                                              ? remark.remark.substring(0, 20) + '...'
                                              : remark.remark
                                            }
                                          </small>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
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
            Add Progress & Attendance for {selectedStudent?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitProgress}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Subject *</Form.Label>
                  <Form.Select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                  >
                    <option value="">Choose a subject...</option>
                    {selectedStudent?.studentCourses?.map(({ course }) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={progressDate}
                    onChange={(e) => setProgressDate(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Attendance Status *</Form.Label>
                  <Form.Select
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value as AttendanceStatus)}
                    required
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                    <option value="EXCUSED">Excused</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Mark attendance status for this session
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lesson</Form.Label>
                  <Form.Control
                    type="text"
                    value={lesson}
                    onChange={(e) => setLesson(e.target.value)}
                    placeholder="Enter lesson topic"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Homework</Form.Label>
                  <Form.Control
                    type="text"
                    value={homework}
                    onChange={(e) => setHomework(e.target.value)}
                    placeholder="Enter homework description"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lesson Progress (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={lessonProgress}
                    onChange={(e) => setLessonProgress(e.target.value)}
                    placeholder="Enter progress percentage"
                    disabled={attendance === 'ABSENT'}
                  />
                  {attendance === 'ABSENT' && (
                    <Form.Text className="text-muted">
                      Progress cannot be recorded for absent students
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Score/Marks</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="Enter score or marks"
                    disabled={attendance === 'ABSENT'}
                  />
                  {attendance === 'ABSENT' && (
                    <Form.Text className="text-muted">
                      Score cannot be recorded for absent students
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label>Remarks</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  attendance === 'ABSENT' 
                    ? "Enter remarks about the absence..." 
                    : "Enter your remarks about student's performance..."
                }
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowProgressModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={updatingProgress}
              >
                {updatingProgress ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Add Progress & Attendance
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