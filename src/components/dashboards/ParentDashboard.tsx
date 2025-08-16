import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Alert, Spinner, Accordion } from 'react-bootstrap';

interface Child {
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
    teacher: {
      id: string;
      name: string;
    };
  }[];
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/my-children');
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
      } else {
        setError('Failed to fetch children data');
      }
    } catch (error) {
      setError('Error fetching children data');
    } finally {
      setLoading(false);
    }
  };

  const getProgressForCourse = (child: Child, courseId: string) => {
    return child.progressRecords.filter(p => p.course.id === courseId);
  };

  const getLatestProgress = (child: Child, courseId: string) => {
    const courseProgress = getProgressForCourse(child, courseId);
    return courseProgress.length > 0 ? courseProgress[0] : null;
  };

  const getAverageProgress = (child: Child) => {
    const coursesWithProgress = child.studentCourses.filter(sc => {
      const latestProgress = getLatestProgress(child, sc.course.id);
      return latestProgress && latestProgress.percent !== null;
    });

    if (coursesWithProgress.length === 0) return null;

    const total = coursesWithProgress.reduce((sum, sc) => {
      const latestProgress = getLatestProgress(child, sc.course.id);
      return sum + (latestProgress?.percent || 0);
    }, 0);

    return Math.round(total / coursesWithProgress.length);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading your children's progress...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">
            <i className="bi bi-people me-2 text-info"></i>
            Parent Dashboard
          </h1>
          <p className="text-muted">Monitor your children's academic progress</p>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {children.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-person-x display-4 text-muted"></i>
            <h4 className="mt-3 text-muted">No Children Assigned</h4>
            <p className="text-muted">You don't have any children assigned to your account. Please contact your administrator.</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {children.map((child) => {
            const averageProgress = getAverageProgress(child);
            return (
              <Col key={child.id} lg={6}>
                <Card className="h-100 shadow-sm">
                  <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="mb-0 fw-bold">{child.name}</h5>
                        <small className="text-muted">{child.email}</small>
                      </div>
                      <div className="text-end">
                        {averageProgress !== null ? (
                          <div>
                            <Badge 
                              bg={averageProgress >= 80 ? 'success' : averageProgress >= 60 ? 'warning' : 'danger'}
                              className="fs-6"
                            >
                              {averageProgress}% Average
                            </Badge>
                            <div className="small text-muted mt-1">Overall Progress</div>
                          </div>
                        ) : (
                          <Badge bg="secondary">No Progress Data</Badge>
                        )}
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {child.studentCourses.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="bi bi-book display-6 text-muted"></i>
                        <p className="mt-2 text-muted">No subjects assigned</p>
                      </div>
                    ) : (
                      <Accordion flush>
                        {child.studentCourses.map(({ course }, index) => {
                          const latestProgress = getLatestProgress(child, course.id);
                          const allProgress = getProgressForCourse(child, course.id);
                          
                          return (
                            <Accordion.Item key={course.id} eventKey={`${child.id}-${index}`}>
                              <Accordion.Header>
                                <div className="d-flex justify-content-between align-items-center w-100 me-3">
                                  <div>
                                    <strong>{course.name}</strong>
                                    {course.description && (
                                      <div className="small text-muted">
                                        {course.description.length > 60 
                                          ? course.description.substring(0, 60) + '...'
                                          : course.description
                                        }
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-end">
                                    {latestProgress ? (
                                      <div>
                                        {latestProgress.percent !== null && (
                                          <Badge 
                                            bg={latestProgress.percent >= 80 ? 'success' : 
                                                latestProgress.percent >= 60 ? 'warning' : 'danger'}
                                          >
                                            {latestProgress.percent}%
                                          </Badge>
                                        )}
                                        <div className="small text-muted">
                                          {new Date(latestProgress.createdAt).toLocaleDateString()}
                                        </div>
                                      </div>
                                    ) : (
                                      <Badge bg="secondary">No Progress</Badge>
                                    )}
                                  </div>
                                </div>
                              </Accordion.Header>
                              <Accordion.Body>
                                {allProgress.length === 0 ? (
                                  <div className="text-center py-3">
                                    <i className="bi bi-graph-up display-6 text-muted"></i>
                                    <p className="mt-2 text-muted">No progress updates yet</p>
                                  </div>
                                ) : (
                                  <div className="table-responsive">
                                    <Table size="sm" className="mb-0">
                                      <thead className="table-light">
                                        <tr>
                                          <th>Date</th>
                                          <th>Teacher</th>
                                          <th>Progress</th>
                                          <th>Notes</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {allProgress.map((progress) => (
                                          <tr key={progress.id}>
                                            <td className="text-muted small">
                                              {new Date(progress.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="fw-medium small">
                                              {progress.teacher.name}
                                            </td>
                                            <td>
                                              {progress.percent !== null ? (
                                                <Badge 
                                                  bg={progress.percent >= 80 ? 'success' : 
                                                      progress.percent >= 60 ? 'warning' : 'danger'}
                                                  className="small"
                                                >
                                                  {progress.percent}%
                                                </Badge>
                                              ) : (
                                                <span className="text-muted small">-</span>
                                              )}
                                            </td>
                                            <td className="small">
                                              {progress.text ? (
                                                <span className="text-muted">
                                                  {progress.text.length > 50 
                                                    ? progress.text.substring(0, 50) + '...'
                                                    : progress.text
                                                  }
                                                </span>
                                              ) : (
                                                <span className="text-muted">No notes</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  </div>
                                )}
                              </Accordion.Body>
                            </Accordion.Item>
                          );
                        })}
                      </Accordion>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}