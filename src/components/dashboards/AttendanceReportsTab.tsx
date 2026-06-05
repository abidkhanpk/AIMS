import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { AttendanceStatus } from '@prisma/client';
import { useTranslation } from 'react-i18next';

interface AttendanceRecord {
  id: string;
  createdAt: string;
  attendance: AttendanceStatus;
  lessonProgress: number;
  student: { name: string; email: string };
  course: { name: string };
  teacher: { name: string };
}

export default function AttendanceReportsTab() {
    const { t } = useTranslation('common');
  const { data: session } = useSession();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) {
        // Set to end of day for the endDate filter
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryParams.append('endDate', end.toISOString());
      }

      const res = await fetch(`/api/reports/attendance?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      setError('Error fetching attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const filteredRecords = records.filter(r => 
    r.student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    r.course.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleExportCSV = () => {
    const csvData = filteredRecords.map(r => ({
      Date: format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm'),
      Student: r.student.name,
      Course: r.course.name,
      Teacher: r.teacher.name,
      Status: r.attendance,
      Progress: `${r.lessonProgress}%`
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `attendance_report_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Attendance Report', 14, 15);
    
    const tableData = filteredRecords.map(r => [
      format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm'),
      r.student.name,
      r.course.name,
      r.attendance,
      `${r.lessonProgress}%`
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Date', 'Student', 'Course', 'Status', 'Progress']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [13, 110, 253] }
    });

    doc.save(`attendance_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  if (!session) return null;

  return (
    <div className="py-2">

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4 mb-0">
          <i className="bi bi-file-earmark-spreadsheet text-primary me-2"></i>
          {t('auto.attendanceReports', `Attendance Reports`)}
                          </h2>
        <div>
          <Button variant="outline-success" className="me-2" onClick={handleExportCSV} disabled={filteredRecords.length === 0}>
            <i className="bi bi-filetype-csv me-1"></i> {t('auto.csv', `CSV`)}
                                </Button>
          <Button variant="outline-danger" onClick={handleExportPDF} disabled={filteredRecords.length === 0}>
            <i className="bi bi-filetype-pdf me-1"></i> {t('auto.pdf', `PDF`)}
                                </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <Form onSubmit={(e) => { e.preventDefault(); fetchReports(); }}>
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small text-muted mb-1">{t('auto.startDate', `Start Date`)}</Form.Label>
                  <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small text-muted mb-1">{t('auto.endDate', `End Date`)}</Form.Label>
                  <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small text-muted mb-1">{t('auto.searchStudentcourse', `Search Student/Course`)}</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder={t('auto.search', `Search...`)} 
                    value={studentSearch} 
                    onChange={e => setStudentSearch(e.target.value)} 
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                  {loading ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-filter"></i> {t('auto.filter', `Filter`)}</>}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0 text-nowrap">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted small px-4 py-3">{t('auto.date', `Date`)}</th>
                  <th className="border-0 text-muted small py-3">{t('auto.student', `Student`)}</th>
                  <th className="border-0 text-muted small py-3">{t('auto.course', `Course`)}</th>
                  <th className="border-0 text-muted small py-3">{t('auto.status', `Status`)}</th>
                  <th className="border-0 text-muted small py-3">{t('auto.progress', `Progress`)}</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      <i className="bi bi-folder-x display-6 d-block mb-3"></i>
                      {t('auto.noAttendanceRecordsFoundForThe', `No attendance records found for the selected criteria.`)}
                                                                  </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 text-muted small">
                        {format(new Date(r.createdAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="fw-medium">{r.student.name}</td>
                      <td>{r.course.name}</td>
                      <td>
                        <Badge bg={r.attendance === 'PRESENT' ? 'success' : r.attendance === 'ABSENT' ? 'danger' : 'warning'}>
                          {r.attendance}
                        </Badge>
                      </td>
                      <td>{r.lessonProgress}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
