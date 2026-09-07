import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface LocationItem {
  name?: string;
  label?: string;
  count?: number;
  value?: number;
}

export interface LocationStats {
  countries?: LocationItem[];
  states?: LocationItem[];
  cities?: LocationItem[];
}

const getName = (item: LocationItem) => item.name ?? item.label ?? "—";
const getCount = (item: LocationItem) => item.count ?? item.value ?? 0;

export function exportLocationStatsToPDF(locationStats: LocationStats) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 90, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Location Analytics Report", margin, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 210);
  const generatedDate = new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  doc.text(`Generated on ${generatedDate}`, margin, 60);

  let cursorY = 120;

  const sections: {
    title: string;
    subtitle: string;
    items: LocationItem[];
    accent: [number, number, number];
  }[] = [
    {
      title: "Countries",
      subtitle: "Geographic distribution",
      items: locationStats.countries || [],
      accent: [37, 99, 235],
    },
    {
      title: "States / Regions",
      subtitle: "Regional breakdown",
      items: locationStats.states || [],
      accent: [79, 70, 229],
    },
    {
      title: "Cities",
      subtitle: "Urban analytics",
      items: locationStats.cities || [],
      accent: [5, 150, 105],
    },
  ];

  sections.forEach((section) => {
    const total = section.items.reduce((sum, i) => sum + getCount(i), 0);

    if (cursorY > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      cursorY = 40;
    }

    doc.setFillColor(...section.accent);
    doc.rect(margin, cursorY, 4, 18, "F");

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(section.title, margin + 12, cursorY + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(section.subtitle, margin + 12, cursorY + 26);

    cursorY += 36;

    if (section.items.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `No ${section.title.toLowerCase()} data available`,
        margin + 12,
        cursorY
      );
      cursorY += 30;
      return;
    }

    const rows = [...section.items]
      .sort((a, b) => getCount(b) - getCount(a))
      .map((item, idx) => {
        const count = getCount(item);
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) + "%" : "—";
        return [String(idx + 1), getName(item), count.toLocaleString(), pct];
      });

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [["#", "Name", "Count", "Share"]],
      body: rows,
      theme: "striped",
      headStyles: {
        fillColor: section.accent,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [55, 65, 81],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 30, halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      styles: {
        cellPadding: 6,
        lineColor: [229, 231, 235],
        lineWidth: 0.5,
      },
    });

    // @ts-expect-error - lastAutoTable is attached at runtime by the plugin
    cursorY = doc.lastAutoTable.finalY + 30;
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin - 40,
      doc.internal.pageSize.getHeight() - 20
    );
  }

  doc.save(`location-stats-${new Date().toISOString().split("T")[0]}.pdf`);
}