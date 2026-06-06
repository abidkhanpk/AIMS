import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Button, Table, Badge, Accordion } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface CourseReport {
  courseName: string;
  teacherName: string;
  latestProgress: number | null;
  averageTestScore: number | null;
  recentTests: { title: string; score: number; date: string }[];
}

interface ReportCard {
  studentId: string;
  studentName: string;
  email: string;
  courses: CourseReport[];
}

export default function ReportCardsTab() {
    const { t } = useTranslation('common');
  const { data: session } = useSession();
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch('/api/reports/report-cards');
        if (!res.ok) throw new Error('Failed to fetch report cards');
        const data = await res.json();
        setReports(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const getScoreVariant = (score: number | null) => {
    if (score === null) return 'secondary';
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const handleGeneratePDF = (report: ReportCard) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Student Report Card', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Student: ${report.studentName}`, 14, 32);
    doc.text(`Email: ${report.email}`, 14, 40);
    doc.text(`Date Generated: ${format(new Date(), 'PPP')}`, 14, 48);

    const tableData: any[] = [];
    report.courses.forEach(c => {
      tableData.push([
        c.courseName,
        c.teacherName,
        c.latestProgress !== null ? `${c.latestProgress}%` : 'N/A',
        c.averageTestScore !== null ? `${c.averageTestScore}%` : 'N/A'
      ]);
    });

    autoTable(doc, {
      startY: 55,
      head: [['Subject', 'Teacher', 'Course Progress', 'Avg Test Score']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 110, 253] }
    });

    doc.save(`${report.studentName.replace(/\s+/g, '_')}_ReportCard.pdf`);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">{t('auto.loadingReportCards', `Loading report cards...`)}</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4 mb-0">
          <i className="bi bi-award text-primary me-2"></i>
          {t('auto.studentReportCards', `Student Report Cards`)}
                          </h2>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {reports.length === 0 ? (
        <Alert variant="info">{t('auto.noStudentReportCardsFound', `No student report cards found.`)}</Alert>
      ) : (
        <Accordion className="shadow-sm">
          {reports.map((report, idx) => (
            <Accordion.Item eventKey={String(idx)} key={report.studentId}>
              <Accordion.Header>
                <div className="d-flex justify-content-between w-100 align-items-center pe-3">
                  <span className="fw-bold">{report.studentName}</span>
                  <Badge bg="secondary">{report.courses.length} {t('auto.subjects', `Subjects`)}</Badge>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <div className="d-flex justify-content-end mb-3">
                  <Button variant="outline-primary" size="sm" onClick={() => handleGeneratePDF(report)}>
                    <i className="bi bi-file-earmark-pdf me-2"></i>
                    {t('auto.downloadPdfReport', `Download PDF Report`)}
                                                </Button>
                </div>
                <Table responsive hover className="align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0">{t('auto.subject', `Subject`)}</th>
                      <th className="border-0">{t('auto.teacher', `Teacher`)}</th>
                      <th className="border-0">{t('auto.courseProgress', `Course Progress`)}</th>
                      <th className="border-0">{t('auto.avgTestScore', `Avg Test Score`)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.courses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-3 text-muted">{t('auto.noCoursesEnrolled', `No courses enrolled.`)}</td>
                      </tr>
                    ) : (
                      report.courses.map((c, i) => (
                        <tr key={i}>
                          <td className="fw-medium">{c.courseName}</td>
                          <td>{c.teacherName}</td>
                          <td>
                            {c.latestProgress !== null ? (
                              <Badge bg={getScoreVariant(c.latestProgress)}>{c.latestProgress}%</Badge>
                            ) : <span className="text-muted small">{t('auto.na', `N/A`)}</span>}
                          </td>
                          <td>
                            {c.averageTestScore !== null ? (
                              <Badge bg={getScoreVariant(c.averageTestScore)}>{c.averageTestScore}%</Badge>
                            ) : <span className="text-muted small">{t('auto.na', `N/A`)}</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </div>
  );
}
