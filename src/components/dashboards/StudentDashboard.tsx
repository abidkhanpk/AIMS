import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Alert, Spinner, ProgressBar, Tabs, Tab, Button } from 'react-bootstrap';
import FeePaymentModal from './FeePaymentModal';
import { FeeStatus, AssessmentType } from '@prisma/client';

interface StudentData {
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
    remarks: string;
    attendance: string;
    createdAt: string;
    course: {
      id: string;
      name: string;
    };
    teacher: {
      id: string;
      name: string;
    };
  }[];
  testRecords: {
    id: string;
    title: string;
    type: AssessmentType;
    performedAt: string;
    maxMarks: number;
    obtainedMarks: number;
    percentage: number;
    performanceNote?: string | null;
    remarks?: string | null;
    course: {
      id: string;
      name: string;
    };
    teacher: {
      id: string;
      name: string;
    };
  }[];
}

interface Assignment {
  id: string;
  studentId: string;
  courseId: string;
  teacherId: string;
  assignmentDate: string;
  startTime?: string;
  duration?: number;
  classDays: string[];
  timezone: string;
  monthlyFee?: number;
  currency: string;
  isActive: boolean;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    name: string;
    description?: string;
  };
  teacher: {
    id: string;
    name: string;
    email: string;
  };
}

interface Fee {
  id: string;
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
  feeDefinition: {
    title: string;
    description?: string;
    amount: number;
    currency: string;
  };
}

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fee payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);

  useEffect(() => {
    fetchStudentData();
    fetchFees();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      // Fetch student progress data
      const progressRes = await fetch('/api/progress/my-progress');
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setStudentData(progressData);
      } else {
        setError('Failed to fetch progress data');
      }

      // Fetch student assignments
      const assignmentsRes = await fetch('/api/assignments');
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData);
      } else {
        console.warn('Failed to fetch assignments data');
        setAssignments([]);
      }
    } catch (error) {
      setError('Error fetching student data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFees = async () => {
    try {
      setFeesLoading(true);
      const res = await fetch('/api/fees');
      if (res.ok) {
        const data = await res.json();
        setFees(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch fees');
        setFees([]);
      }
    } catch (error) {
      console.error('Error fetching fees');
      setFees([]);
    } finally {
      setFeesLoading(false);
    }
  };

  const handlePayFeeClick = (fee: Fee) => {
    setSelectedFee(fee);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (paymentDetails: any) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentDetails),
      });

      if (res.ok) {
        setSuccess('Fee payment submitted successfully! Awaiting admin verification.');
        fetchFees(); // Refresh fees data
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to submit payment');
      }
    } catch (error) {
      setError('Error submitting payment');
    }
  };

  const getProgressForCourse = (courseId: string) => {
    if (!studentData || !studentData.progressRecords) return [];
    return studentData.progressRecords.filter(p => p.course.id === courseId);
  };

  const getLatestProgress = (courseId: string) => {
    const courseProgress = getProgressForCourse(courseId);
    return courseProgress.length > 0 ? courseProgress[0] : null;
  };

  const getOverallProgress = () => {
    if (!studentData || !studentData.studentCourses) return null;
    
    const coursesWithProgress = studentData.studentCourses.filter(sc => {
      const latestProgress = getLatestProgress(sc.course.id);
      return latestProgress && latestProgress.lessonProgress !== null;
    });

    if (coursesWithProgress.length === 0) return null;

    const total = coursesWithProgress.reduce((sum, sc) => {
      const latestProgress = getLatestProgress(sc.course.id);
      return sum + (latestProgress?.lessonProgress || 0);
    }, 0);

    return Math.round(total / coursesWithProgress.length);
  };

  const getTestsForCourse = (courseId: string) => {
    if (!studentData || !studentData.testRecords) return [];
    return studentData.testRecords.filter((t) => t.course.id === courseId);
  };

  const getOverallTestAverage = () => {
    if (!studentData || !studentData.testRecords || studentData.testRecords.length === 0) return null;
    const total = studentData.testRecords.reduce((sum, test) => sum + (test.percentage || 0), 0);
    return Math.round(total / studentData.testRecords.length);
  };

  const getProgressVariant = (percent: number) => {
    if (percent >= 80) return 'success';
    if (percent >= 60) return 'warning';
    return 'danger';
  };

  const getAttendanceBadge = (attendance: string) => {
    switch (attendance) {
      case 'PRESENT':
        return <Badge bg="success" className="small">Present</Badge>;
      case 'ABSENT':
        return <Badge bg="danger" className="small">Absent</Badge>;
      case 'LATE':
        return <Badge bg="warning" className="small">Late</Badge>;
      case 'EXCUSED':
        return <Badge bg="info" className="small">Excused</Badge>;
      default:
        return <Badge bg="secondary" className="small">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: FeeStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge bg="success">Paid</Badge>;
      case 'PENDING':
        return <Badge bg="warning">Pending</Badge>;
      case 'PROCESSING':
        return <Badge bg="info">Processing</Badge>;
      case 'OVERDUE':
        return <Badge bg="danger">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currencies = [
      { code: 'USD', symbol: '$' },
      { code: 'EUR', symbol: '€' },
      { code: 'GBP', symbol: '£' },
      { code: 'JPY', symbol: '¥' },
      { code: 'CAD', symbol: 'C$' },
      { code: 'AUD', symbol: 'A$' },
      { code: 'CHF', symbol: 'CHF' },
      { code: 'CNY', symbol: '¥' },
      { code: 'INR', symbol: '₹' },
      { code: 'PKR', symbol: '₨' },
    ];
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading your progress...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="text-center py-5">
        <Alert variant="warning">No student data found</Alert>
      </div>
    );
  }

  const overallProgress = getOverallProgress();
  const overallTestAverage = getOverallTestAverage();

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">
            <i className="bi bi-mortarboard me-2 text-warning"></i>
            Student Dashboard
          </h1>
          <p className="text-muted">Track your academic progress across all subjects</p>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs defaultActiveKey="progress" id="student-dashboard-tabs" className="mb-4">
        <Tab eventKey="progress" title="Progress">
          {/* Overall Progress Card */}
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm">
                <Card.Body>
                  <Row className="align-items-center">
                    <Col md={8}>
                      <h5 className="mb-1">Welcome back, {studentData.name}!</h5>
                      <p className="text-muted mb-0">Here&apos;s your overall academic progress</p>
                    </Col>
                    <Col md={4} className="text-md-end">
                      {overallProgress !== null ? (
                        <div>
                          <h3 className={`mb-0 text-${getProgressVariant(overallProgress)}`}>
                            {overallProgress}%
                          </h3>
                          <small className="text-muted">Overall Progress</small>
                        </div>
                      ) : (
                        <div>
                          <h5 className="mb-0 text-muted">No Data</h5>
                          <small className="text-muted">No progress recorded yet</small>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Current Assignments */}
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm">
                <Card.Header className="bg-primary text-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                      <i className="bi bi-list-task me-2"></i>
                      Current Assignments
                    </h6>
                    <Badge bg="light" text="dark">{assignments.length}</Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  {assignments.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-list-task display-6 text-muted"></i>
                      <h5 className="mt-3 text-muted">No Assignments Found</h5>
                      <p className="text-muted">You don&apos;t have any assignments yet. Please contact your administrator to get assigned to subjects and teachers.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table hover className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Subject</th>
                            <th>Teacher</th>
                            <th>Schedule</th>
                            <th>Class Days</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map((assignment) => (
                            <tr key={assignment.id}>
                              <td className="fw-medium">{assignment.course?.name}</td>
                              <td className="text-muted">{assignment.teacher?.name}</td>
                              <td className="small">
                                {assignment.startTime && (
                                  <div><strong>Time:</strong> {assignment.startTime}</div>
                                )}
                                {assignment.duration && (
                                  <div><strong>Duration:</strong> {assignment.duration} minutes</div>
                                )}
                              </td>
                              <td className="small">
                                {assignment.classDays && assignment.classDays.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-1">
                                    {assignment.classDays.map(day => (
                                      <Badge key={day} bg="secondary" className="small">
                                        {day.substring(0, 3)}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted">Not specified</span>
                                )}
                              </td>
                              <td>
                                <Badge bg={assignment.isActive ? 'success' : 'secondary'}>
                                  {assignment.isActive ? 'Active' : 'Inactive'}
                                </Badge>
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

          {/* Subjects Progress */}
          {!studentData.studentCourses || studentData.studentCourses.length === 0 ? (
            <Card className="text-center py-5">
              <Card.Body>
                <i className="bi bi-book display-4 text-muted"></i>
                <h4 className="mt-3 text-muted">No Subjects Assigned</h4>
                <p className="text-muted">You don&apos;t have any subjects assigned yet. Please contact your administrator.</p>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {studentData.studentCourses.map(({ course }) => {
                const latestProgress = getLatestProgress(course.id);
                const allProgress = getProgressForCourse(course.id);
                
                return (
                  <Col key={course.id} lg={6}>
                    <Card className="h-100 shadow-sm">
                      <Card.Header className="bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-0 fw-bold">{course.name}</h6>
                            {course.description && (
                              <small className="text-muted">{course.description}</small>
                            )}
                          </div>
                          <div className="text-end">
                            {latestProgress && latestProgress.lessonProgress !== null ? (
                              <div>
                                <Badge bg={getProgressVariant(latestProgress.lessonProgress)} className="fs-6">
                                  {latestProgress.lessonProgress}%
                                </Badge>
                                <div className="small text-muted mt-1">Current Progress</div>
                              </div>
                            ) : (
                              <Badge bg="secondary">No Progress</Badge>
                            )}
                          </div>
                        </div>
                        {latestProgress && latestProgress.lessonProgress !== null && (
                          <div className="mt-2">
                            <ProgressBar 
                              now={latestProgress.lessonProgress} 
                              variant={getProgressVariant(latestProgress.lessonProgress)}
                              style={{ height: '8px' }}
                            />
                          </div>
                        )}
                      </Card.Header>
                      <Card.Body>
                        {allProgress.length === 0 ? (
                          <div className="text-center py-3">
                            <i className="bi bi-graph-up display-6 text-muted"></i>
                            <p className="mt-2 text-muted">No progress updates yet</p>
                            <small className="text-muted">Your teacher will update your progress soon</small>
                          </div>
                        ) : (
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="mb-0">Progress History</h6>
                              <Badge bg="info">{allProgress.length} Updates</Badge>
                            </div>
                            <div className="table-responsive">
                              <Table size="sm" className="mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>Date</th>
                                    <th>Teacher</th>
                                    <th>Lesson</th>
                                    <th>Progress</th>
                                    <th>Attendance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allProgress.slice(0, 5).map((progress) => (
                                    <tr key={progress.id}>
                                      <td className="text-muted small">
                                        {new Date(progress.date).toLocaleDateString()}
                                      </td>
                                      <td className="fw-medium small">
                                        {progress.teacher.name}
                                      </td>
                                      <td className="small">
                                        {progress.lesson ? (
                                          <span className="text-muted">
                                            {progress.lesson.length > 20 
                                              ? progress.lesson.substring(0, 20) + '...'
                                              : progress.lesson
                                            }
                                          </span>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                      <td>
                                        {progress.lessonProgress !== null ? (
                                          <Badge 
                                            bg={getProgressVariant(progress.lessonProgress)}
                                            className="small"
                                          >
                                            {progress.lessonProgress}%
                                          </Badge>
                                        ) : (
                                          <span className="text-muted small">-</span>
                                        )}
                                      </td>
                                      <td>
                                        {getAttendanceBadge(progress.attendance)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                              {allProgress.length > 5 && (
                                <div className="text-center mt-2">
                                  <small className="text-muted">
                                    Showing latest 5 of {allProgress.length} updates
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Tab>
        <Tab eventKey="tests" title="Tests & Exams">
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm">
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">Your tests & exam results</h5>
                    <p className="text-muted mb-0">Track obtained marks, percentages, and remarks</p>
                  </div>
                  <div className="text-end">
                    {overallTestAverage !== null ? (
                      <div>
                        <h3 className={`mb-0 text-${overallTestAverage >= 80 ? 'success' : overallTestAverage >= 60 ? 'warning' : 'danger'}`}>
                          {overallTestAverage}%
                        </h3>
                        <small className="text-muted">Average score</small>
                      </div>
                    ) : (
                      <div>
                        <h5 className="mb-0 text-muted">No Data</h5>
                        <small className="text-muted">No tests recorded yet</small>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {!studentData.testRecords || studentData.testRecords.length === 0 ? (
            <Card className="text-center py-5">
              <Card.Body>
                <i className="bi bi-journal-check display-4 text-muted"></i>
                <h4 className="mt-3 text-muted">No Tests Recorded</h4>
                <p className="text-muted">Your teachers will add test and exam results here once available.</p>
              </Card.Body>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-journal-check me-2"></i>
                  Recent Tests & Exams
                </h6>
                <Badge bg="info">{studentData.testRecords.length}</Badge>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Test/Exam</th>
                        <th>Type</th>
                        <th>Score</th>
                        <th>Percentage</th>
                        <th>Performance</th>
                        <th>Remarks</th>
                        <th>Teacher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentData.testRecords.map((test) => (
                        <tr key={test.id}>
                          <td className="text-muted small">
                            {new Date(test.performedAt).toLocaleDateString()}
                          </td>
                          <td className="fw-medium small">{test.course.name}</td>
                          <td className="small">{test.title}</td>
                          <td>
                            <Badge bg={
                              test.type === 'EXAM'
                                ? 'danger'
                                : test.type === 'HOMEWORK'
                                  ? 'secondary'
                                  : test.type === 'OTHER'
                                    ? 'info'
                                    : 'info'
                            }>
                              {test.type === 'EXAM'
                                ? 'Exam'
                                : test.type === 'HOMEWORK'
                                  ? 'Homework'
                                  : test.type === 'OTHER'
                                    ? 'Other'
                                    : 'Quiz'}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg="dark">
                              {test.obtainedMarks}/{test.maxMarks}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={test.percentage >= 80 ? 'success' : test.percentage >= 60 ? 'warning' : 'danger'}>
                              {test.percentage}%
                            </Badge>
                          </td>
                          <td className="small">{test.performanceNote || '-'}</td>
                          <td className="small">{test.remarks || '-'}</td>
                          <td className="small">{test.teacher?.name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </Tab>
        <Tab eventKey="fees" title="Fees">
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
              {feesLoading ? (
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
                        <th>Title</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((fee) => (
                        <tr key={fee.id}>
                          <td>{fee.feeDefinition.title}</td>
                          <td className="text-muted small">
                            {fee.feeDefinition.description || '-'}
                          </td>
                          <td className="fw-bold text-success">{getCurrencySymbol(fee.feeDefinition.currency)}{fee.feeDefinition.amount.toFixed(2)}</td>
                          <td className="text-muted small">
                            {new Date(fee.dueDate).toLocaleDateString()}
                          </td>
                          <td>{getStatusBadge(fee.status)}</td>
                          <td>
                            {(fee.status === 'PENDING' || fee.status === 'OVERDUE') && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handlePayFeeClick(fee)}
                              >
                                <i className="bi bi-credit-card me-1"></i>
                                Pay Now
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Recent Activity Summary */}
      {studentData.progressRecords && studentData.progressRecords.length > 0 && (
        <Row className="mt-4">
          <Col>
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-clock-history me-2"></i>
                  Recent Activity
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="row">
                  <div className="col-md-3 text-center">
                    <div className="border-end">
                      <h4 className="text-primary mb-0">{assignments.length}</h4>
                      <small className="text-muted">Active Assignments</small>
                    </div>
                  </div>
                  <div className="col-md-3 text-center">
                    <div className="border-end">
                      <h4 className="text-info mb-0">{studentData.studentCourses?.length || 0}</h4>
                      <small className="text-muted">Enrolled Subjects</small>
                    </div>
                  </div>
                  <div className="col-md-3 text-center">
                    <div className="border-end">
                      <h4 className="text-success mb-0">{studentData.progressRecords?.length || 0}</h4>
                      <small className="text-muted">Progress Updates</small>
                    </div>
                  </div>
                  <div className="col-md-3 text-center">
                    <h4 className={`mb-0 text-${overallProgress ? getProgressVariant(overallProgress) : 'muted'}`}>
                      {overallProgress || 0}%
                    </h4>
                    <small className="text-muted">Average Progress</small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {selectedFee && (
        <FeePaymentModal
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          fee={selectedFee}
          onPaymentSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  );
}
