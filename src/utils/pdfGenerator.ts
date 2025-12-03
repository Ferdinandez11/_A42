import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Función auxiliar local para formatear dinero
const formatMoney = (amount: number) => {
    return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

export const generateBudgetPDF = async (order: any, items3D: any[], manualItems: any[]) => {
  const doc = new jsPDF();
  const margin = 20;
  const rightMargin = 190; // Alineación derecha estándar A4
  
  // --- CABECERA ---
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  // Alineado a la derecha
  doc.text("PRESUPUESTO", rightMargin, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  // Alineado a la derecha debajo del título
  doc.text(`Referencia: ${order.order_ref}`, rightMargin, 28, { align: 'right' });
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, rightMargin, 33, { align: 'right' });
  if(order.custom_name) {
      doc.text(`Proyecto: ${order.custom_name}`, rightMargin, 38, { align: 'right' });
  }

  // Datos de tu empresa
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Mi Empresa S.L.", margin, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Calle Industria 123", margin, 26);
  doc.text("28000 Madrid", margin, 31);
  doc.text("info@miempresa.com", margin, 36);

  // Línea separadora
  doc.setDrawColor(200);
  doc.line(margin, 45, rightMargin, 45);
  
  // Datos del Cliente
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Cliente:", margin, 55);
  doc.setFontSize(10);
  doc.setTextColor(80);
  const clientName = order.profiles?.company_name || order.profiles?.full_name || 'Particular';
  const clientEmail = order.profiles?.email || '';
  const clientPhone = order.profiles?.phone || '';
  const clientCif = order.profiles?.cif ? `CIF/NIF: ${order.profiles.cif}` : '';
  
  doc.text(clientName, margin, 62);
  doc.text(clientEmail, margin, 67);
  doc.text(clientPhone, margin, 72);
  if (clientCif) doc.text(clientCif, margin, 77);

  // --- IMAGEN DEL PROYECTO (Con más espacio) ---
  // Calculamos dónde empezará la tabla dinámicamente
  let tableStartY = 95; // Posición por defecto si no hay imagen

  if (order.projects?.thumbnail_url) {
    try {
        const img = new Image();
        img.src = order.projects.thumbnail_url;
        img.crossOrigin = "Anonymous";
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        
        // Imagen alineada a la derecha
        doc.addImage(img, 'JPEG', 120, 50, 70, 45); // x, y, ancho, alto
        tableStartY = 110; // Bajamos la tabla para dejar aire
    } catch (e) {
        console.warn("No se pudo cargar imagen PDF", e);
    }
  }

  // --- TABLA DE ITEMS ---
  const tableRows: any[] = [];

  // 1. Items 3D
  items3D.forEach(item => {
    // Lógica para Referencia y Cantidad/Medida
    const ref = item.id ? item.id.substring(0, 8).toUpperCase() : '3D-DESIGN';
    // Si tiene 'info' (dimensiones calculadas), lo usamos. Si no, la cantidad.
    const qtyDisplay = item.info ? item.info : item.quantity.toString();

    tableRows.push([
        item.name,
        ref,
        qtyDisplay,
        formatMoney(item.unitPrice || item.price)
    ]);
  });

  // 2. Items Manuales
  manualItems.forEach(item => {
    const ref = 'EXTRA-MAN';
    const qtyDisplay = item.dimensions ? item.dimensions : item.quantity.toString();

    tableRows.push([
        item.name,
        ref,
        qtyDisplay,
        formatMoney(item.total_price)
    ]);
  });

  // @ts-ignore
  autoTable(doc, {
    startY: tableStartY,
    head: [['Concepto', 'Referencia', 'Cant. / Medida', 'Precio Total']], // Encabezados cambiados
    body: tableRows,
    theme: 'striped',
    headStyles: { 
        fillColor: [41, 128, 185],
        halign: 'left' // Alineación general headers
    },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 
        0: { cellWidth: 'auto' }, // Concepto
        1: { cellWidth: 30 },     // Referencia
        2: { cellWidth: 30, halign: 'center' }, // Cant/Medida
        3: { cellWidth: 30, halign: 'right' }   // Precio (contenido)
    },
    // Forzar alineación derecha específicamente al header de la columna 3 (Precio)
    didParseCell: function(data) {
        if (data.section === 'head' && data.column.index === 3) {
            data.cell.styles.halign = 'right';
        }
    }
  });

  // --- CÁLCULO DE TOTALES E IVA ---
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 10;
  
  // 1. Recuperar valores
  const finalSavedPrice = order.total_price; // Este es el precio final negociado (Base Imponible)
  const discountRate = order.profiles?.discount_rate || 0;
  
  // 2. Cálculo inverso para sacar el Subtotal Bruto antes de descuento
  let subtotalBruto = finalSavedPrice;
  if (discountRate > 0 && finalSavedPrice > 0) {
      subtotalBruto = finalSavedPrice / (1 - (discountRate / 100));
  } else if (finalSavedPrice === 0) {
      // Fallback por si es 0
      subtotalBruto = items3D.reduce((a,b) => a + b.totalPrice, 0) + manualItems.reduce((a,b) => a + b.total_price, 0);
  }

  // 3. Cálculo de IVA
  const baseImponible = finalSavedPrice > 0 ? finalSavedPrice : subtotalBruto; // Lo que queda tras el descuento
  const ivaAmount = baseImponible * 0.21; // 21% IVA
  const totalConIva = baseImponible + ivaAmount;

  // --- PINTAR TOTALES ---
  const textXLabel = 135; // Columna etiquetas
  const textXValue = 190; // Columna valores (alineados derecha)
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  
  // Subtotal
  doc.text(`Subtotal:`, textXLabel, finalY);
  doc.text(formatMoney(subtotalBruto), textXValue, finalY, { align: 'right' });
  
  // Descuento (si hay)
  if (discountRate > 0) {
      finalY += 6;
      doc.setTextColor(230, 126, 34); // Naranja
      doc.text(`Dto. (${discountRate}%):`, textXLabel, finalY);
      const discountAmount = subtotalBruto - baseImponible;
      doc.text(`-${formatMoney(discountAmount)}`, textXValue, finalY, { align: 'right' });
  }

  // Base Imponible
  finalY += 6;
  doc.setTextColor(0); // Negro
  doc.text(`Base Imponible:`, textXLabel, finalY);
  doc.text(formatMoney(baseImponible), textXValue, finalY, { align: 'right' });

  // IVA
  finalY += 6;
  doc.text(`IVA (21%):`, textXLabel, finalY);
  doc.text(formatMoney(ivaAmount), textXValue, finalY, { align: 'right' });

  // TOTAL FINAL
  finalY += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL:`, textXLabel, finalY);
  doc.setTextColor(41, 128, 185); // Azul
  doc.text(formatMoney(totalConIva), textXValue, finalY, { align: 'right' });

  // --- PIE ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text("Este presupuesto tiene una validez de 15 días.", margin, 280);
  doc.text("Forma de pago: 50% al aceptar, 50% antes de la entrega.", margin, 284);

  return doc.output('blob');
};