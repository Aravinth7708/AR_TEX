import { useEffect, useState } from "react";
import { Calendar, Download, TrendingUp, Users, Wallet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Labour {
  id: string;
  name: string;
  total_salary: number;
  advance: number;
  created_at: string;
}

interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  labours: {
    name: string;
    totalSalary: number;
    advance: number;
    finalAmount: number;
    worksCount: number;
  }[];
  totalSalary: number;
  totalAdvance: number;
  totalPayout: number;
}

const WeeklyReport = () => {
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  const downloadRef = useState<HTMLDivElement | null>(null)[0];

  const getWeekRange = (date: Date): { start: Date; end: Date } => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { start: weekStart, end: weekEnd };
  };

  const fetchWeeklyData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("labours")
        .select("id, name, total_salary, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group data by week
      const weeklyMap = new Map<string, Labour[]>();
      
      (data || []).forEach((labour) => {
        const labourDate = new Date(labour.created_at);
        const { start } = getWeekRange(labourDate);
        const weekKey = start.toISOString().split('T')[0];
        
        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, []);
        }
        
        const parts = labour.name.split(' | ');
        const advance = parseFloat(parts[3] || '0');
        weeklyMap.get(weekKey)!.push({ ...labour, advance });
      });

      // Create weekly summaries
      const summaries: WeeklySummary[] = [];
      
      weeklyMap.forEach((labours, weekKey) => {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Group by labour name
        const labourMap = new Map<string, {
          totalSalary: number;
          advance: number;
          worksCount: number;
        }>();

        labours.forEach((labour) => {
          const baseName = labour.name.split(' | ')[0];
          
          if (!labourMap.has(baseName)) {
            labourMap.set(baseName, {
              totalSalary: 0,
              advance: 0,
              worksCount: 0,
            });
          }
          
          const labourData = labourMap.get(baseName)!;
          labourData.totalSalary += labour.total_salary || 0;
          labourData.advance += labour.advance || 0;
          labourData.worksCount += 1;
        });

        const laboursList = Array.from(labourMap.entries()).map(([name, data]) => ({
          name,
          totalSalary: data.totalSalary,
          advance: data.advance,
          finalAmount: data.totalSalary - data.advance,
          worksCount: data.worksCount,
        }));

        const totalSalary = laboursList.reduce((sum, l) => sum + l.totalSalary, 0);
        const totalAdvance = laboursList.reduce((sum, l) => sum + l.advance, 0);
        const totalPayout = totalSalary - totalAdvance;

        summaries.push({
          weekStart,
          weekEnd,
          labours: laboursList,
          totalSalary,
          totalAdvance,
          totalPayout,
        });
      });

      summaries.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
      setWeeklySummaries(summaries);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
      toast.error("Failed to load weekly reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSummary = weeklySummaries[parseInt(selectedWeek)] || null;

  const formatWeekRange = (start: Date, end: Date) => {
    return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  const downloadAsImage = async () => {
    const element = document.getElementById("weekly-report-download");
    if (!element) {
      toast.error("Content not found");
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        width: 1200,
        height: element.scrollHeight,
      });

      const link = document.createElement("a");
      const fileName = `weekly-report-${currentSummary?.weekStart.toISOString().split('T')[0]}.jpg`;
      link.download = fileName;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();

      toast.success("Downloaded as image");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    }
  };

  const downloadAsPDF = async () => {
    const element = document.getElementById("weekly-report-download");
    if (!element) {
      toast.error("Content not found");
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        width: 1200,
        height: element.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width / 2, canvas.height / 2);

      const fileName = `weekly-report-${currentSummary?.weekStart.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast.success("Downloaded as PDF");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="card-elevated p-4 md:p-6 animate-fade-in max-w-7xl mx-auto" style={{ animationDelay: "0.2s" }}>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg gradient-primary flex items-center justify-center">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
              Weekly Salary Report
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Weekly labour payment summary
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-full sm:w-[250px] h-11">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {weeklySummaries.map((summary, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {formatWeekRange(summary.weekStart, summary.weekEnd)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentSummary && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={downloadAsImage}
                variant="outline"
                className="flex-1 sm:flex-none h-11"
                size="default"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Image</span>
                <span className="sm:hidden">Download Image</span>
              </Button>
              <Button
                onClick={downloadAsPDF}
                variant="outline"
                className="flex-1 sm:flex-none h-11"
                size="default"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">PDF</span>
                <span className="sm:hidden">Download PDF</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : weeklySummaries.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No weekly data available</p>
          <p className="text-sm text-muted-foreground/70">
            Add labour records to see weekly reports
          </p>
        </div>
      ) : currentSummary ? (
        <>
          {/* Hidden Professional Download Version */}
          <div 
            id="weekly-report-download"
            style={{
              position: 'fixed',
              left: '-9999px',
              top: 0,
              width: '1200px',
              backgroundColor: '#ffffff',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            <div style={{ padding: '60px', backgroundColor: '#ffffff' }}>
              {/* Header */}
              <div style={{
                textAlign: 'center',
                marginBottom: '40px',
                borderBottom: '4px solid #f59e0b',
                paddingBottom: '30px'
              }}>
                <h1 style={{
                  fontSize: '48px',
                  fontWeight: '800',
                  color: '#1a1a1a',
                  marginBottom: '12px',
                  letterSpacing: '-0.5px'
                }}>AR TEXTILES</h1>
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: '600',
                  color: '#f59e0b',
                  marginBottom: '16px'
                }}>Weekly Salary Report</h2>
                <div style={{
                  fontSize: '18px',
                  color: '#666',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '40px',
                  marginTop: '20px'
                }}>
                  <div>
                    <span style={{ fontWeight: '600', color: '#1a1a1a' }}>Week: </span>
                    {formatWeekRange(currentSummary.weekStart, currentSummary.weekEnd)}
                  </div>
                  <div>
                    <span style={{ fontWeight: '600', color: '#1a1a1a' }}>Generated: </span>
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '24px',
                marginBottom: '40px'
              }}>
                <div style={{
                  padding: '24px',
                  backgroundColor: '#f0f9ff',
                  border: '2px solid #3b82f6',
                  borderRadius: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                    Total Labours
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: '800', color: '#3b82f6' }}>
                    {currentSummary.labours.length}
                  </div>
                </div>
                <div style={{
                  padding: '24px',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #22c55e',
                  borderRadius: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                    Total Salary
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: '800', color: '#22c55e' }}>
                    ₹{currentSummary.totalSalary.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  padding: '24px',
                  backgroundColor: '#fef2f2',
                  border: '2px solid #ef4444',
                  borderRadius: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                    Total Advance
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: '800', color: '#ef4444' }}>
                    ₹{currentSummary.totalAdvance.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  padding: '24px',
                  backgroundColor: '#fffbeb',
                  border: '3px solid #f59e0b',
                  borderRadius: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
                    Final Payout
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: '900', color: '#f59e0b' }}>
                    ₹{currentSummary.totalPayout.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Labour Details Table */}
              <div style={{ marginBottom: '40px' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '3px solid #e5e7eb',
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f59e0b' }}>
                      <th style={{
                        padding: '20px',
                        textAlign: 'left',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#ffffff',
                        borderRight: '2px solid #ffffff'
                      }}>Labour Name</th>
                      <th style={{
                        padding: '20px',
                        textAlign: 'center',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#ffffff',
                        borderRight: '2px solid #ffffff'
                      }}>Works</th>
                      <th style={{
                        padding: '20px',
                        textAlign: 'right',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#ffffff',
                        borderRight: '2px solid #ffffff'
                      }}>Total Salary</th>
                      <th style={{
                        padding: '20px',
                        textAlign: 'right',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#ffffff',
                        borderRight: '2px solid #ffffff'
                      }}>Advance</th>
                      <th style={{
                        padding: '20px',
                        textAlign: 'right',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#ffffff'
                      }}>Final Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSummary.labours.map((labour, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        <td style={{
                          padding: '18px 20px',
                          fontSize: '17px',
                          fontWeight: '600',
                          color: '#1a1a1a',
                          borderRight: '1px solid #e5e7eb'
                        }}>{labour.name}</td>
                        <td style={{
                          padding: '18px 20px',
                          fontSize: '17px',
                          fontWeight: '500',
                          color: '#666',
                          textAlign: 'center',
                          borderRight: '1px solid #e5e7eb'
                        }}>{labour.worksCount}</td>
                        <td style={{
                          padding: '18px 20px',
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#22c55e',
                          textAlign: 'right',
                          borderRight: '1px solid #e5e7eb'
                        }}>₹{labour.totalSalary.toFixed(2)}</td>
                        <td style={{
                          padding: '18px 20px',
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#ef4444',
                          textAlign: 'right',
                          borderRight: '1px solid #e5e7eb'
                        }}>{labour.advance > 0 ? `₹${labour.advance.toFixed(2)}` : '-'}</td>
                        <td style={{
                          padding: '18px 20px',
                          fontSize: '20px',
                          fontWeight: '800',
                          color: '#f59e0b',
                          textAlign: 'right'
                        }}>₹{labour.finalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{
                      backgroundColor: '#fef3c7',
                      borderTop: '4px solid #f59e0b'
                    }}>
                      <td style={{
                        padding: '22px 20px',
                        fontSize: '20px',
                        fontWeight: '800',
                        color: '#1a1a1a',
                        borderRight: '1px solid #f59e0b'
                      }}>TOTAL</td>
                      <td style={{
                        padding: '22px 20px',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1a1a1a',
                        textAlign: 'center',
                        borderRight: '1px solid #f59e0b'
                      }}>{currentSummary.labours.reduce((sum, l) => sum + l.worksCount, 0)}</td>
                      <td style={{
                        padding: '22px 20px',
                        fontSize: '20px',
                        fontWeight: '800',
                        color: '#22c55e',
                        textAlign: 'right',
                        borderRight: '1px solid #f59e0b'
                      }}>₹{currentSummary.totalSalary.toFixed(2)}</td>
                      <td style={{
                        padding: '22px 20px',
                        fontSize: '20px',
                        fontWeight: '800',
                        color: '#ef4444',
                        textAlign: 'right',
                        borderRight: '1px solid #f59e0b'
                      }}>₹{currentSummary.totalAdvance.toFixed(2)}</td>
                      <td style={{
                        padding: '22px 20px',
                        fontSize: '24px',
                        fontWeight: '900',
                        color: '#f59e0b',
                        textAlign: 'right'
                      }}>₹{currentSummary.totalPayout.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary Footer */}
              <div style={{
                backgroundColor: '#fef3c7',
                border: '3px solid #f59e0b',
                borderRadius: '16px',
                padding: '30px',
                marginTop: '40px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '30px',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
                      Total Labour Count
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#1a1a1a' }}>
                      {currentSummary.labours.length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
                      Total Works Completed
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#1a1a1a' }}>
                      {currentSummary.labours.reduce((sum, l) => sum + l.worksCount, 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
                      Average per Labour
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#f59e0b' }}>
                      ₹{(currentSummary.totalPayout / currentSummary.labours.length).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                marginTop: '50px',
                paddingTop: '30px',
                borderTop: '2px solid #e5e7eb',
                textAlign: 'center',
                color: '#999'
              }}>
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                  Generated by AR TEXTILES Labour Management System
                </p>
                <p style={{ fontSize: '12px' }}>
                  © {new Date().getFullYear()} AR TEXTILES — Garment Manufacturing
                </p>
              </div>
            </div>
          </div>

          <div id="weekly-report-content" className="space-y-4 md:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="border-accent/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardDescription className="text-xs">Total Labours</CardDescription>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                    {currentSummary.labours.length}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-green-500/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardDescription className="text-xs">Total Salary</CardDescription>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                    ₹{currentSummary.totalSalary.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-red-500/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardDescription className="text-xs">Total Advance</CardDescription>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <Wallet className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                    ₹{currentSummary.totalAdvance.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-accent/30 bg-accent/5">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardDescription className="text-xs font-semibold">Final Payout</CardDescription>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2 text-accent">
                    <Wallet className="w-4 h-4 md:w-5 md:h-5" />
                    ₹{currentSummary.totalPayout.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Labour Details Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground">
                        Labour Name
                      </th>
                      <th className="text-center p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground hidden sm:table-cell">
                        Works
                      </th>
                      <th className="text-right p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground">
                        Salary
                      </th>
                      <th className="text-right p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground hidden md:table-cell">
                        Advance
                      </th>
                      <th className="text-right p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground">
                        Final
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSummary.labours.map((labour, index) => (
                      <tr
                        key={index}
                        className="border-t border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 md:p-4">
                          <div>
                            <p className="font-medium text-sm md:text-base text-foreground">
                              {labour.name}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {labour.worksCount} work{labour.worksCount !== 1 ? 's' : ''}
                            </p>
                            {labour.advance > 0 && (
                              <p className="text-xs text-red-500 md:hidden mt-1">
                                Adv: ₹{labour.advance.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 md:p-4 text-center text-sm md:text-base text-muted-foreground hidden sm:table-cell">
                          {labour.worksCount}
                        </td>
                        <td className="p-3 md:p-4 text-right font-semibold text-sm md:text-base text-green-600">
                          ₹{labour.totalSalary.toFixed(2)}
                        </td>
                        <td className="p-3 md:p-4 text-right font-semibold text-sm md:text-base text-red-500 hidden md:table-cell">
                          {labour.advance > 0 ? `₹${labour.advance.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3 md:p-4 text-right font-bold text-sm md:text-base text-accent">
                          ₹{labour.finalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-accent/10 border-t-2 border-accent">
                    <tr>
                      <td className="p-3 md:p-4 font-bold text-sm md:text-base text-foreground">
                        Total
                      </td>
                      <td className="p-3 md:p-4 text-center font-semibold text-sm md:text-base hidden sm:table-cell">
                        {currentSummary.labours.reduce((sum, l) => sum + l.worksCount, 0)}
                      </td>
                      <td className="p-3 md:p-4 text-right font-bold text-sm md:text-base text-green-600">
                        ₹{currentSummary.totalSalary.toFixed(2)}
                      </td>
                      <td className="p-3 md:p-4 text-right font-bold text-sm md:text-base text-red-500 hidden md:table-cell">
                        ₹{currentSummary.totalAdvance.toFixed(2)}
                      </td>
                      <td className="p-3 md:p-4 text-right font-bold text-base md:text-lg text-accent">
                        ₹{currentSummary.totalPayout.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="text-center sm:text-left">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Week Period</p>
                  <p className="font-semibold text-sm md:text-base text-foreground">
                    {formatWeekRange(currentSummary.weekStart, currentSummary.weekEnd)}
                  </p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Works</p>
                  <p className="font-semibold text-sm md:text-base text-foreground">
                    {currentSummary.labours.reduce((sum, l) => sum + l.worksCount, 0)} work(s)
                  </p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Average per Labour</p>
                  <p className="font-semibold text-sm md:text-base text-accent">
                    ₹{(currentSummary.totalPayout / currentSummary.labours.length).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default WeeklyReport;
