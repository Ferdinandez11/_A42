import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SceneItem } from "@/domain/types/editor";
import { PriceCalculator } from "@/pdf/utils/PriceCalculator";

/**
 * Builds PDF document pages with layout and content
 */
export class PDFDocumentBuilder {
  
  public generateDocument(
    doc: jsPDF,
    projectName: string,
    coverImg: string,
    views: Record<string, string>,
    items: SceneItem[],
    uniqueItemsMap: Map<string, SceneItem>,
    itemImages: Record<string, { img: string; width: number; height: number }>,
    user: any
  ): void {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cover page
    this.addHeader(doc, projectName, "Dossier del Proyecto");
    if (coverImg) {
      this.drawImageProp(doc, coverImg, margin, 50, pageWidth - 2 * margin, 120);
    }
    this.addFooter(doc);

    // Technical views page
    doc.addPage();
    this.addHeader(doc, "Vistas Técnicas", "");
    this.addTechnicalViews(doc, views, margin, pageWidth);
    this.addFooter(doc);

    // Budget page (only if user exists)
    if (user) {
      doc.addPage();
      this.addHeader(doc, "Estimación orientativa", "");
      this.addBudgetTable(doc, items);
      this.addFooter(doc);
    }

    // Technical sheets for each unique item
    for (const [key, item] of uniqueItemsMap) {
      doc.addPage();
      this.addTechnicalSheet(doc, item, itemImages[key], margin, pageWidth);
      this.addFooter(doc);
    }

    doc.save(`${projectName}_Levipark.pdf`);
  }

  private addTechnicalViews(
    doc: jsPDF,
    views: Record<string, string>,
    margin: number,
    pageWidth: number
  ): void {
    const gridWidth = (pageWidth - 3 * margin) / 2;
    const gridHeight = 80;
    const yRow1 = 50;
    const yRow2 = yRow1 + gridHeight + 15;

    doc.setFontSize(10);
    doc.text("Alzado (Frontal)", margin, yRow1 - 2);
    if (views.front) {
      this.drawImageProp(doc, views.front, margin, yRow1, gridWidth, gridHeight);
    }
    doc.text("Perfil (Lateral)", margin + gridWidth + margin, yRow1 - 2);
    if (views.side) {
      this.drawImageProp(doc, views.side, margin + gridWidth + margin, yRow1, gridWidth, gridHeight);
    }
    doc.text("Planta (Superior)", margin, yRow2 - 2);
    if (views.top) {
      this.drawImageProp(doc, views.top, margin, yRow2, gridWidth, gridHeight);
    }
    doc.text("Isométrica", margin + gridWidth + margin, yRow2 - 2);
    if (views.iso) {
      this.drawImageProp(doc, views.iso, margin + gridWidth + margin, yRow2, gridWidth, gridHeight);
    }
  }

  private addBudgetTable(doc: jsPDF, items: SceneItem[]): void {
    let total = 0;
    const tableData = items.map((item) => {
      const price = PriceCalculator.getItemPrice(item);
      total += price;
      return [
        item.name || "Elemento",
        item.productId.substring(0, 15).toUpperCase(),
        PriceCalculator.getItemDimensions(item),
        price.toLocaleString("es-ES", {
          style: "currency",
          currency: "EUR",
        }),
      ];
    });
    const vat = total * 0.21;

    autoTable(doc, {
      head: [["Concepto", "Ref", "Ud/Dim", "Precio"]],
      body: tableData,
      startY: 40,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      foot: [
        [
          "",
          "",
          "Base Imponible",
          total.toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          }),
        ],
        [
          "",
          "",
          "IVA 21%",
          vat.toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          }),
        ],
        [
          "",
          "",
          "TOTAL",
          (total + vat).toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          }),
        ],
      ],
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: "bold",
        halign: "right",
      },
      columnStyles: { 3: { halign: "right" } },
    });
  }

  private addTechnicalSheet(
    doc: jsPDF,
    item: SceneItem,
    image: { img: string; width: number; height: number } | undefined,
    margin: number,
    pageWidth: number
  ): void {
    const anyItem = item as any;

    this.addHeader(
      doc,
      item.name || "Ficha Técnica",
      item.productId.toUpperCase()
    );

    if (image) {
      this.drawImageProp(
        doc,
        image.img,
        margin,
        40,
        pageWidth - 2 * margin,
        100
      );
    }

    const yStart = 150;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Descripción:", margin, yStart);
    doc.setFontSize(10);
    doc.setTextColor(80);

    const descriptionRaw = this.findValueInItem(anyItem, [
      "DESCRIPCION",
      "Descripcion",
      "Description",
      "description",
    ]);
    const finalDescription = descriptionRaw
      ? descriptionRaw
      : "Elemento certificado para uso público conforme a normativa vigente.";
    const splitDescription = doc.splitTextToSize(
      finalDescription,
      pageWidth - 2 * margin
    );
    doc.text(splitDescription, margin, yStart + 7);

    // Dynamic links
    let linkY = yStart + 20 + splitDescription.length * 5;
    doc.setFont("helvetica", "bold");

    const urlTech = this.findValueInItem(anyItem, [
      "URL_TECH",
      "url_tech",
      "Url_Tech",
    ]);
    linkY += this.renderLinkLine(
      doc,
      "Ficha Técnica (PDF)",
      urlTech,
      margin,
      linkY
    );

    const urlCert = this.findValueInItem(anyItem, [
      "URL_CERT",
      "url_cert",
      "Url_Cert",
    ]);
    linkY += this.renderLinkLine(
      doc,
      "Certificado de Conformidad",
      urlCert,
      margin,
      linkY
    );

    const urlInst = this.findValueInItem(anyItem, [
      "URL_INST",
      "url_inst",
      "Url_Inst",
    ]);
    linkY += this.renderLinkLine(
      doc,
      "Instrucciones de Montaje",
      urlInst,
      margin,
      linkY
    );
  }

  private renderLinkLine(
    doc: jsPDF,
    label: string,
    url: string | undefined,
    x: number,
    y: number
  ): number {
    if (!url) return 0;
    doc.setTextColor(0, 0, 255);
    doc.textWithLink(`${label}: ${url}`, x, y, { url });
    return 8;
  }

  private findValueInItem(item: any, keys: string[]): string | undefined {
    for (const k of keys) {
      const val = item[k];
      if (val !== undefined && val !== null && val !== "") {
        return String(val);
      }
    }
    return undefined;
  }

  private drawImageProp(
    doc: jsPDF,
    dataUrl: string,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number
  ): void {
    const img = new Image();
    img.src = dataUrl;
    const iw = img.width;
    const ih = img.height;
    if (!iw || !ih) {
      doc.addImage(dataUrl, "JPEG", x, y, maxWidth, maxHeight);
      return;
    }
    const ratio = iw / ih;
    let finalW = maxWidth;
    let finalH = maxWidth / ratio;
    if (finalH > maxHeight) {
      finalH = maxHeight;
      finalW = maxHeight * ratio;
    }
    const offsetX = x + (maxWidth - finalW) / 2;
    const offsetY = y + (maxHeight - finalH) / 2;
    doc.addImage(dataUrl, "JPEG", offsetX, offsetY, finalW, finalH);
  }

  private addHeader(doc: jsPDF, title: string, subtitle: string): void {
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title, 15, 15);
    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(subtitle, 15, 22);
    }
    doc.setTextColor(0);
  }

  private addFooter(doc: jsPDF): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(230, 230, 230);
    doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Levipark | www.levipark.com", 15, pageHeight - 7);
    doc.text(
      `Página ${doc.getCurrentPageInfo().pageNumber}`,
      pageWidth - 40,
      pageHeight - 7
    );
  }
}