import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Formats a number as currency in EUR
 */
const formatMoney = (amount: number): string => {
  return (
    amount.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
};

// Type definitions
interface Profile {
  company_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  cif?: string;
  discount_rate?: number;
}

interface Project {
  thumbnail_url?: string;
}

interface Order {
  order_ref: string;
  custom_name?: string;
  total_price: number;
  profiles?: Profile;
  projects?: Project;
}

interface Item3D {
  id?: string;
  name: string;
  info?: string;
  quantity: number;
  unitPrice?: number;
  price: number;
  totalPrice: number;
}

interface ManualItem {
  name: string;
  dimensions?: string;
  quantity: number;
  total_price: number;
}

/**
 * Generates a budget PDF document
 * @param order - Order information
 * @param items3D - List of 3D items
 * @param manualItems - List of manual items
 * @param budgetDate - Date when the budget was created (defaults to current date)
 * @returns PDF blob
 */
export const generateBudgetPDF = async (
  order: Order,
  items3D: Item3D[],
  manualItems: ManualItem[],
  budgetDate?: Date
): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const rightMargin = 190; // Standard A4 right alignment
  const budgetDateToUse = budgetDate || new Date();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("PRESUPUESTO", rightMargin, 20, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Referencia: ${order.order_ref}`, rightMargin, 28, {
    align: "right",
  });
  doc.text(`Fecha: ${budgetDateToUse.toLocaleDateString('es-ES')}`, rightMargin, 33, {
    align: "right",
  });
  if (order.custom_name) {
    doc.text(`Proyecto: ${order.custom_name}`, rightMargin, 38, {
      align: "right",
    });
  }

  // Company data
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Mi Empresa S.L.", margin, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Calle Industria 123", margin, 26);
  doc.text("28000 Madrid", margin, 31);
  doc.text("info@miempresa.com", margin, 36);

  // Separator line
  doc.setDrawColor(200);
  doc.line(margin, 45, rightMargin, 45);

  // Client data
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Cliente:", margin, 55);
  doc.setFontSize(10);
  doc.setTextColor(80);

  const clientName =
    order.profiles?.company_name || order.profiles?.full_name || "Particular";
  const clientEmail = order.profiles?.email || "";
  const clientPhone = order.profiles?.phone || "";
  const clientCif = order.profiles?.cif ? `CIF/NIF: ${order.profiles.cif}` : "";

  doc.text(clientName, margin, 62);
  doc.text(clientEmail, margin, 67);
  doc.text(clientPhone, margin, 72);
  if (clientCif) {
    doc.text(clientCif, margin, 77);
  }

  // Project image
  let tableStartY = 95; // Default position if no image

  if (order.projects?.thumbnail_url) {
    try {
      const img = new Image();
      img.src = order.projects.thumbnail_url;
      img.crossOrigin = "Anonymous";
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

      // Image aligned to the right
      doc.addImage(img, "JPEG", 120, 50, 70, 45);
      tableStartY = 110; // Move table down to leave space
    } catch (error) {
      // Image loading failure is non-critical, continue without image
      if (import.meta.env.DEV) {
        console.warn("Could not load PDF image", error);
      }
    }
  }

  // Items table
  const tableRows: (string | number)[][] = [];

  // 3D items
  items3D.forEach((item) => {
    const ref = item.id ? item.id.substring(0, 8).toUpperCase() : "3D-DESIGN";
    const qtyDisplay = item.info ? item.info : item.quantity.toString();

    tableRows.push([
      item.name,
      ref,
      qtyDisplay,
      formatMoney(item.unitPrice || item.price),
    ]);
  });

  // Manual items
  manualItems.forEach((item) => {
    const ref = "EXTRA-MAN";
    const qtyDisplay = item.dimensions
      ? item.dimensions
      : item.quantity.toString();

    tableRows.push([item.name, ref, qtyDisplay, formatMoney(item.total_price)]);
  });

  // Generate table
  autoTable(doc, {
    startY: tableStartY,
    head: [["Concepto", "Referencia", "Cant. / Medida", "Precio Total"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [41, 128, 185],
      halign: "left",
    },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: "auto" }, // Concept
      1: { cellWidth: 30 }, // Reference
      2: { cellWidth: 30, halign: "center" }, // Quantity/Measure
      3: { cellWidth: 30, halign: "right" }, // Price
    },
    didParseCell: function (data) {
      // Force right alignment for price header
      if (data.section === "head" && data.column.index === 3) {
        data.cell.styles.halign = "right";
      }
    },
  });

  // Calculate totals and VAT
  // @ts-ignore - jsPDF types
  let finalY = doc.lastAutoTable.finalY + 10;

  // Get saved values
  const finalSavedPrice = order.total_price; // Final negotiated price (taxable base)
  const discountRate = order.profiles?.discount_rate || 0;

  // Reverse calculation to get gross subtotal before discount
  let subtotalGross = finalSavedPrice;
  if (discountRate > 0 && finalSavedPrice > 0) {
    subtotalGross = finalSavedPrice / (1 - discountRate / 100);
  } else if (finalSavedPrice === 0) {
    // Fallback if zero
    subtotalGross =
      items3D.reduce((acc, item) => acc + item.totalPrice, 0) +
      manualItems.reduce((acc, item) => acc + item.total_price, 0);
  }

  // Calculate VAT
  const taxableBase = finalSavedPrice > 0 ? finalSavedPrice : subtotalGross;
  const vatAmount = taxableBase * 0.21; // 21% VAT
  const totalWithVat = taxableBase + vatAmount;

  // Draw totals
  const labelX = 135; // Label column
  const valueX = 190; // Value column (right aligned)

  doc.setFontSize(10);
  doc.setTextColor(0);

  // Subtotal
  doc.text("Subtotal:", labelX, finalY);
  doc.text(formatMoney(subtotalGross), valueX, finalY, { align: "right" });

  // Discount (if applicable)
  if (discountRate > 0) {
    finalY += 6;
    doc.setTextColor(230, 126, 34); // Orange
    doc.text(`Dto. (${discountRate}%):`, labelX, finalY);
    const discountAmount = subtotalGross - taxableBase;
    doc.text(`-${formatMoney(discountAmount)}`, valueX, finalY, {
      align: "right",
    });
  }

  // Taxable base
  finalY += 6;
  doc.setTextColor(0); // Black
  doc.text("Base Imponible:", labelX, finalY);
  doc.text(formatMoney(taxableBase), valueX, finalY, { align: "right" });

  // VAT
  finalY += 6;
  doc.text("IVA (21%):", labelX, finalY);
  doc.text(formatMoney(vatAmount), valueX, finalY, { align: "right" });

  // Final total
  finalY += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", labelX, finalY);
  doc.setTextColor(41, 128, 185); // Blue
  doc.text(formatMoney(totalWithVat), valueX, finalY, { align: "right" });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont("helvetica", "normal");
  doc.text("Este presupuesto tiene una validez de 15 días.", margin, 280);
  doc.text(
    "Forma de pago: 50% al aceptar, 50% antes de la entrega.",
    margin,
    284
  );

  return doc.output("blob");
};