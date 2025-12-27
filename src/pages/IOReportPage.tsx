import { useEffect, useState, useRef } from "react";
import React from "react";
import { FileText, Download, RefreshCw, Search, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface IOData {
  ioNumber: string;
  totalQuantity: number;
  labours: {
    name: string;
    quantity: number;
    workType: string;
  }[];
}

const IOReportPage = () => {
  const [ioData, setIoData] = useState<IOData[]>([]);
  const [filteredData, setFilteredData] = useState<IOData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);  const individualDownloadRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fetchIOReport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("labours")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ioMap = new Map<string, IOData>();

      (data || []).forEach((labour) => {
        const parts = labour.name.split(" | ");
        if (parts.length < 3) return;

        const labourName = parts[0].trim();
        const ioNumber = parts[1].trim();
        const workType = parts[2].trim();
        const quantity = labour.pieces || 0;

        if (!ioNumber) return;

        if (!ioMap.has(ioNumber)) {
          ioMap.set(ioNumber, {
            ioNumber,
            totalQuantity: 0,
            labours: [],
          });
        }

        const ioEntry = ioMap.get(ioNumber)!;
        ioEntry.totalQuantity += quantity;
        ioEntry.labours.push({
          name: labourName,
          quantity,
          workType,
        });
      });

      const sortedIOData = Array.from(ioMap.values()).sort((a, b) => {
        const numA = parseInt(a.ioNumber) || 0;
        const numB = parseInt(b.ioNumber) || 0;
        return numA - numB;
      });

      setIoData(sortedIOData);
      setFilteredData(sortedIOData);
    } catch (error) {
      console.error("Error fetching IO report:", error);
      toast.error("Failed to load IO report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIOReport();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(ioData);
    } else {
      const filtered = ioData.filter((io) =>
        io.ioNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, ioData]);

  const handleDownloadImage = async () => {
    if (!downloadRef.current) return;

    try {
      toast.info("Generating image...");
      
      const canvas = await html2canvas(downloadRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `IO_Report_${new Date().toISOString().split("T")[0]}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("Image downloaded successfully");
        }
      });
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  const handleDownloadPDF = async () => {
    if (!downloadRef.current) return;

    try {
      toast.info("Generating PDF...");

      const canvas = await html2canvas(downloadRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? "portrait" : "landscape",
        unit: "mm",
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`IO_Report_${new Date().toISOString().split("T")[0]}.pdf`);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const downloadIOAsImage = async (ioNumber: string) => {
    const element = individualDownloadRefs.current.get(ioNumber);
    if (!element) return;

    try {
      toast.info("Generating image...");

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `IO_${ioNumber}_${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Error downloading IO as image:", error);
      toast.error("Failed to download image");
    }
  };

  const downloadIOAsPDF = async (ioNumber: string) => {
    const element = individualDownloadRefs.current.get(ioNumber);
    if (!element) return;

    try {
      toast.info("Generating PDF...");

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? "portrait" : "landscape",
        unit: "mm",
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`IO_${ioNumber}_${new Date().toISOString().split("T")[0]}.pdf`);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating IO PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const totalQuantityAll = filteredData.reduce((sum, io) => sum + io.totalQuantity, 0);
  const totalLaboursAll = filteredData.reduce((sum, io) => sum + io.labours.length, 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Navigation />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="card-elevated p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
                    IO Report
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Production summary grouped by IO Number
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchIOReport}
                  disabled={isLoading}
                  className="h-9"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadImage}
                  disabled={isLoading || filteredData.length === 0}
                  className="h-9"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Image
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isLoading || filteredData.length === 0}
                  className="h-9"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>

            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by IO Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {!isLoading && filteredData.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total IOs</p>
                  <p className="text-lg md:text-xl font-bold text-primary">{filteredData.length}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Quantity</p>
                  <p className="text-lg md:text-xl font-bold text-primary">{totalQuantityAll}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Labours</p>
                  <p className="text-lg md:text-xl font-bold text-primary">{totalLaboursAll}</p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden Download Template */}
          <div 
            ref={downloadRef}
            style={{
              position: "absolute",
              left: "0",
              top: "-99999px",
              backgroundColor: "#ffffff",
              fontFamily: "Arial, sans-serif",
              padding: "40px",
              width: "1000px",
            }}
          >
            <div style={{
              textAlign: "center",
              marginBottom: "30px",
              borderBottom: "3px solid #f59e0b",
              paddingBottom: "20px",
            }}>
              <h1 style={{
                fontSize: "32px",
                fontWeight: "800",
                color: "#1a1a1a",
                marginBottom: "8px",
                letterSpacing: "-0.5px",
              }}>
                AR TEXTILES
              </h1>
              <h2 style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#f59e0b",
                marginBottom: "12px",
              }}>
                IO Production Report
              </h2>
              <p style={{
                fontSize: "14px",
                color: "#999999",
              }}>
                Generated on {new Date().toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "2px solid #e5e5e5",
              marginBottom: "30px",
              tableLayout: "fixed",
            }}>
              <colgroup>
                <col style={{ width: "15%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: "#16a34a" }}>
                  <th style={{
                    padding: "14px",
                    textAlign: "left",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#ffffff",
                    border: "1px solid #16a34a",
                  }}>IO Number</th>
                  <th style={{
                    padding: "14px",
                    textAlign: "left",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#ffffff",
                    border: "1px solid #16a34a",
                  }}>Labour Name</th>
                  <th style={{
                    padding: "14px",
                    textAlign: "left",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#ffffff",
                    border: "1px solid #16a34a",
                  }}>Work Type</th>
                  <th style={{
                    padding: "14px",
                    textAlign: "right",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#ffffff",
                    border: "1px solid #16a34a",
                  }}>Quantity</th>
                  <th style={{
                    padding: "14px",
                    textAlign: "right",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#ffffff",
                    border: "1px solid #16a34a",
                  }}>IO Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((io, ioIndex) => (
                  <React.Fragment key={io.ioNumber}>
                    {io.labours.map((labour, idx) => (
                      <tr key={`${io.ioNumber}-${idx}`} style={{
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                      }}>
                        <td style={{
                          padding: "14px 10px",
                          fontSize: idx === 0 ? "18px" : "16px",
                          fontWeight: idx === 0 ? "700" : "500",
                          color: "#f59e0b",
                          border: "1px solid #d1d5db",
                          backgroundColor: "#fffbeb",
                          textAlign: "center",
                          borderTop: idx === 0 ? "3px solid #f59e0b" : "1px solid #e5e7eb",
                        }}>
                          {io.ioNumber}
                        </td>
                        <td style={{
                          padding: "14px",
                          fontSize: "15px",
                          color: "#1a1a1a",
                          border: "1px solid #d1d5db",
                          fontWeight: "500",
                          borderTop: idx === 0 ? "3px solid #f59e0b" : "1px solid #d1d5db",
                        }}>{labour.name}</td>
                        <td style={{
                          padding: "14px",
                          fontSize: "14px",
                          color: "#666666",
                          border: "1px solid #d1d5db",
                          borderTop: idx === 0 ? "3px solid #f59e0b" : "1px solid #d1d5db",
                        }}>{labour.workType}</td>
                        <td style={{
                          padding: "14px",
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#16a34a",
                          textAlign: "right",
                          border: "1px solid #d1d5db",
                          borderTop: idx === 0 ? "3px solid #f59e0b" : "1px solid #d1d5db",
                        }}>{labour.quantity}</td>
                        <td style={{
                          padding: "14px 10px",
                          fontSize: idx === 0 ? "22px" : "18px",
                          fontWeight: idx === 0 ? "700" : "600",
                          color: "#16a34a",
                          textAlign: "center",
                          border: "1px solid #d1d5db",
                          backgroundColor: "#f0fdf4",
                          borderTop: idx === 0 ? "3px solid #f59e0b" : "1px solid #e5e7eb",
                        }}>
                          {io.totalQuantity}
                        </td>
                      </tr>
                    ))}
                    {ioIndex < filteredData.length - 1 && (
                      <tr>
                        <td colSpan={5} style={{
                          height: "12px",
                          backgroundColor: "#e5e7eb",
                          border: "none",
                        }}></td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            <div style={{
              marginTop: "40px",
              padding: "25px",
              backgroundColor: "#f0fdf4",
              border: "3px solid #f59e0b",
              borderRadius: "12px",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "20px",
                textAlign: "center",
              }}>
                <div>
                  <p style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}>Total IOs</p>
                  <p style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#f59e0b",
                  }}>{filteredData.length}</p>
                </div>
                <div>
                  <p style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}>Total Quantity</p>
                  <p style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#22c55e",
                  }}>{totalQuantityAll}</p>
                </div>
                <div>
                  <p style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}>Total Labours</p>
                  <p style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#16a34a",
                  }}>{totalLaboursAll}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden Individual IO Download Templates */}
          {filteredData.map((io) => (
            <div 
              key={`download-${io.ioNumber}`}
              ref={(el) => {
                if (el) {
                  individualDownloadRefs.current.set(io.ioNumber, el);
                }
              }}
              style={{
                position: "absolute",
                left: "0",
                top: "-99999px",
                backgroundColor: "#ffffff",
                fontFamily: "Arial, sans-serif",
                padding: "40px",
                width: "800px",
              }}
            >
              <div style={{
                textAlign: "center",
                marginBottom: "30px",
                borderBottom: "3px solid #f59e0b",
                paddingBottom: "20px",
              }}>
                <h1 style={{
                  fontSize: "32px",
                  fontWeight: "800",
                  color: "#1a1a1a",
                  marginBottom: "8px",
                  letterSpacing: "-0.5px",
                }}>
                  AR TEXTILES
                </h1>
                <h2 style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#f59e0b",
                  marginBottom: "12px",
                }}>
                  IO Production Report - {io.ioNumber}
                </h2>
                <p style={{
                  fontSize: "14px",
                  color: "#999999",
                }}>
                  Generated on {new Date().toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div style={{
                marginBottom: "20px",
                padding: "20px",
                backgroundColor: "#fffbeb",
                border: "2px solid #f59e0b",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <p style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "4px",
                  }}>IO Number</p>
                  <p style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#f59e0b",
                  }}>{io.ioNumber}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "4px",
                  }}>Total Quantity</p>
                  <p style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#22c55e",
                  }}>{io.totalQuantity}</p>
                </div>
              </div>

              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "2px solid #e5e5e5",
                marginBottom: "30px",
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#16a34a" }}>
                    <th style={{
                      padding: "14px",
                      textAlign: "left",
                      fontSize: "15px",
                      fontWeight: "600",
                      color: "#ffffff",
                      border: "1px solid #16a34a",
                    }}>Labour Name</th>
                    <th style={{
                      padding: "14px",
                      textAlign: "left",
                      fontSize: "15px",
                      fontWeight: "600",
                      color: "#ffffff",
                      border: "1px solid #16a34a",
                    }}>Work Type</th>
                    <th style={{
                      padding: "14px",
                      textAlign: "right",
                      fontSize: "15px",
                      fontWeight: "600",
                      color: "#ffffff",
                      border: "1px solid #16a34a",
                    }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {io.labours.map((labour, idx) => (
                    <tr key={idx} style={{
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                    }}>
                      <td style={{
                        padding: "14px",
                        fontSize: "15px",
                        color: "#1a1a1a",
                        border: "1px solid #d1d5db",
                        fontWeight: "500",
                      }}>{labour.name}</td>
                      <td style={{
                        padding: "14px",
                        fontSize: "14px",
                        color: "#666666",
                        border: "1px solid #d1d5db",
                      }}>{labour.workType}</td>
                      <td style={{
                        padding: "14px",
                        fontSize: "15px",
                        fontWeight: "600",
                        color: "#16a34a",
                        textAlign: "right",
                        border: "1px solid #d1d5db",
                      }}>{labour.quantity}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} style={{
                      padding: "14px",
                      fontSize: "16px",
                      fontWeight: "700",
                      color: "#1a1a1a",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#f0fdf4",
                      textAlign: "right",
                    }}>TOTAL:</td>
                    <td style={{
                      padding: "14px",
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#16a34a",
                      textAlign: "right",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#f0fdf4",
                    }}>{io.totalQuantity}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{
                marginTop: "30px",
                padding: "20px",
                backgroundColor: "#f0fdf4",
                border: "2px solid #22c55e",
                borderRadius: "8px",
                textAlign: "center",
              }}>
                <p style={{
                  fontSize: "14px",
                  color: "#666",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}>Total Labours</p>
                <p style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#16a34a",
                }}>{io.labours.length}</p>
              </div>
            </div>
          ))}

          {/* Display View */}
          <div className="card-elevated p-4 md:p-6">
            <div className="text-center mb-6 md:mb-8 pb-4 md:pb-6 border-b-2 border-orange-500">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
                AR TEXTILES
              </h1>
              <h2 className="text-base md:text-xl font-semibold text-orange-500 mb-3">
                IO Production Report
              </h2>
              <p className="text-xs md:text-sm text-gray-500">
                Generated on {new Date().toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No IO found matching your search" : "No IO data available"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block" style={{ marginBottom: "30px" }}>
                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "2px solid #e5e5e5",
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: "#16a34a" }}>
                        <th style={{
                          padding: "14px",
                          textAlign: "left",
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#ffffff",
                          border: "1px solid #16a34a",
                        }}>IO Number</th>
                        <th style={{
                          padding: "14px",
                          textAlign: "left",
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#ffffff",
                          border: "1px solid #16a34a",
                        }}>Labour Name</th>
                        <th style={{
                          padding: "14px",
                          textAlign: "left",
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#ffffff",
                          border: "1px solid #16a34a",
                        }}>Work Type</th>
                        <th style={{
                          padding: "14px",
                          textAlign: "right",
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#ffffff",
                          border: "1px solid #16a34a",
                        }}>Quantity</th>
                        <th style={{
                          padding: "14px",
                          textAlign: "right",
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#ffffff",
                          border: "1px solid #16a34a",
                        }}>IO Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((io) => (
                        <>
                          {io.labours.map((labour, idx) => (
                            <tr key={`${io.ioNumber}-${idx}`} style={{
                              backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                            }}>
                              {idx === 0 ? (
                                <td
                                  rowSpan={io.labours.length}
                                  style={{
                                    padding: "14px",
                                    fontSize: "18px",
                                    fontWeight: "700",
                                    color: "#f59e0b",
                                    border: "1px solid #d1d5db",
                                    backgroundColor: "#fffbeb",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {io.ioNumber}
                                </td>
                              ) : null}
                              <td style={{
                                padding: "14px",
                                fontSize: "15px",
                                color: "#1a1a1a",
                                border: "1px solid #d1d5db",
                              }}>{labour.name}</td>
                              <td style={{
                                padding: "14px",
                                fontSize: "15px",
                                color: "#666666",
                                border: "1px solid #d1d5db",
                              }}>{labour.workType}</td>
                              <td style={{
                                padding: "14px",
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "#16a34a",
                                textAlign: "right",
                                border: "1px solid #d1d5db",
                              }}>{labour.quantity}</td>
                              {idx === 0 ? (
                                <td
                                  rowSpan={io.labours.length}
                                  style={{
                                    padding: "14px",
                                    fontSize: "24px",
                                    fontWeight: "700",
                                    color: "#16a34a",
                                    textAlign: "right",
                                    border: "1px solid #d1d5db",
                                    backgroundColor: "#f0fdf4",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {io.totalQuantity}
                                </td>
                              ) : null}
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={5} style={{
                              height: "8px",
                              backgroundColor: "#f3f4f6",
                              border: "none",
                            }}></td>
                          </tr>
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden" style={{ marginBottom: "30px" }}>
                  {filteredData.map((io, ioIdx) => (
                    <div 
                      key={io.ioNumber}
                      style={{
                        marginBottom: ioIdx < filteredData.length - 1 ? "20px" : "0",
                        border: "2px solid #e5e5e5",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      {/* IO Header */}
                      <div style={{
                        padding: "16px",
                        backgroundColor: "#fffbeb",
                        borderBottom: "2px solid #f59e0b",
                      }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}>
                          <div>
                            <p style={{
                              fontSize: "12px",
                              color: "#666",
                              marginBottom: "4px",
                            }}>IO Number</p>
                            <p style={{
                              fontSize: "24px",
                              fontWeight: "700",
                              color: "#f59e0b",
                            }}>{io.ioNumber}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{
                              fontSize: "12px",
                              color: "#666",
                              marginBottom: "4px",
                            }}>IO Total</p>
                            <p style={{
                              fontSize: "24px",
                              fontWeight: "700",
                              color: "#22c55e",
                            }}>{io.totalQuantity}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" style={{ fontSize: "12px", padding: "4px 12px" }}>
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => downloadIOAsImage(io.ioNumber)}>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                As Image
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadIOAsPDF(io.ioNumber)}>
                                <FileText className="h-4 w-4 mr-2" />
                                As PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Labour Details */}
                      <div style={{ padding: "12px" }}>
                        <table style={{
                          width: "100%",
                          borderCollapse: "collapse",
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: "#16a34a" }}>
                              <th style={{
                                padding: "10px 8px",
                                textAlign: "left",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#ffffff",
                                border: "1px solid #16a34a",
                              }}>Labour</th>
                              <th style={{
                                padding: "10px 8px",
                                textAlign: "left",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#ffffff",
                                border: "1px solid #16a34a",
                              }}>Work</th>
                              <th style={{
                                padding: "10px 8px",
                                textAlign: "right",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#ffffff",
                                border: "1px solid #16a34a",
                              }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {io.labours.map((labour, idx) => (
                              <tr key={idx} style={{
                                backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                              }}>
                                <td style={{
                                  padding: "10px 8px",
                                  fontSize: "13px",
                                  color: "#1a1a1a",
                                  border: "1px solid #d1d5db",
                                  fontWeight: "600",
                                }}>{labour.name}</td>
                                <td style={{
                                  padding: "10px 8px",
                                  fontSize: "12px",
                                  color: "#666",
                                  border: "1px solid #d1d5db",
                                }}>{labour.workType}</td>
                                <td style={{
                                  padding: "10px 8px",
                                  fontSize: "14px",
                                  fontWeight: "700",
                                  color: "#16a34a",
                                  textAlign: "right",
                                  border: "1px solid #d1d5db",
                                }}>{labour.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: "40px",
                  padding: "25px",
                  backgroundColor: "#f0fdf4",
                  border: "3px solid #f59e0b",
                  borderRadius: "12px",
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "20px",
                    textAlign: "center",
                  }}>
                    <div>
                      <p style={{
                        fontSize: "14px",
                        color: "#666",
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}>Total IOs</p>
                      <p style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#f59e0b",
                      }}>{filteredData.length}</p>
                    </div>
                    <div>
                      <p style={{
                        fontSize: "14px",
                        color: "#666",
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}>Total Quantity</p>
                      <p style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#22c55e",
                      }}>{totalQuantityAll}</p>
                    </div>
                    <div>
                      <p style={{
                        fontSize: "14px",
                        color: "#666",
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}>Total Labours</p>
                      <p style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#16a34a",
                      }}>{totalLaboursAll}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-border mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AR TEXTILES — Garment Manufacturing
          </p>
        </div>
      </footer>
    </div>
  );
};

export default IOReportPage;
