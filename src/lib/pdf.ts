// Génération d'un vrai fichier PDF (A4) à partir de la lettre affichée, avec le plan en annexe.
// Les bibliothèques sont chargées à la demande pour ne pas alourdir le reste de l'application.

export async function buildDeclarationPdf(
  letter: HTMLElement,
  annex: { mapImage: string | null; legend: string; itinerary: string } | null,
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;
  const margin = 14;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  const canvas = await html2canvas(letter, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const pxPerMm = canvas.width / contentW;
  const sliceH = Math.floor(contentH * pxPerMm);
  for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
    const part = document.createElement("canvas");
    part.width = canvas.width;
    part.height = Math.min(sliceH, canvas.height - y);
    part.getContext("2d")?.drawImage(canvas, 0, y, canvas.width, part.height, 0, 0, canvas.width, part.height);
    if (page > 0) pdf.addPage();
    pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, contentW, part.height / pxPerMm);
  }

  if (annex && (annex.mapImage || annex.itinerary)) {
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Annexe : plan et itinéraire", margin, margin + 4);
    let y = margin + 10;
    if (annex.mapImage) {
      const h = contentW * (640 / 1000);
      pdf.addImage(annex.mapImage, "JPEG", margin, y, contentW, h);
      y += h + 6;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const legendLines = pdf.splitTextToSize(annex.legend, contentW) as string[];
      pdf.text(legendLines, margin, y);
      y += legendLines.length * 4 + 6;
    }
    if (annex.itinerary) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Itinéraire", margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(pdf.splitTextToSize(annex.itinerary, contentW), margin, y + 6);
    }
  }
  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
