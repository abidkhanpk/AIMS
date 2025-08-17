import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Alert, Spinner, ProgressBar } from 'react-bootstrap';

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
    score: number;
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
}

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudentProgress();
  }, []);

  const fetchStudentProgress = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/progress/my-progress');
      if (res.ok) {
        const data = await res.json();
        setStudentData(data);
      } else {
        setError('Failed to fetch progress data');
      }
    } catch (error) {
      setError('Error fetching progress data');
    } finally {
      setLoading(false);
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
                                <th>Score</th>
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
                                    {progress.score !== null ? (
                                      <Badge bg="success" className="small">
                                        {progress.score}
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
                  <div className="col-md-4 text-center">
                    <div className="border-end">
                      <h4 className="text-primary mb-0">{studentData.studentCourses?.length || 0}</h4>
                      <small className="text-muted">Enrolled Subjects</small>
                    </div>
                  </div>
                  <div className="col-md-4 text-center">
                    <div className="border-end">
                      <h4 className="text-success mb-0">{studentData.progressRecords?.length || 0}</h4>
                      <small className="text-muted">Progress Updates</small>
                    </div>
                  </div>
                  <div className="col-md-4 text-center">
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
    </div>
  );
}