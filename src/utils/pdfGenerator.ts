import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PriceCalculator } from './PriceCalculator';

export const generateBudgetPDF = async (order: any, items3D: any[], manualItems: any[]) => {
  const doc = new jsPDF();
  const margin = 20;
  
  // --- CABECERA ---
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("PRESUPUESTO", 150, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Referencia: ${order.order_ref}`, 150, 28);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 150, 33);
  if(order.custom_name) {
      doc.text(`Proyecto: ${order.custom_name}`, 150, 38);
  }

  // Datos de tu empresa (Hardcodeados o config)
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Mi Empresa S.L.", margin, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Calle Industria 123", margin, 26);
  doc.text("28000 Madrid", margin, 31);
  doc.text("info@miempresa.com", margin, 36);

  // Datos del Cliente
  doc.setDrawColor(200);
  doc.line(margin, 45, 190, 45);
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Cliente:", margin, 55);
  doc.setFontSize(10);
  doc.setTextColor(80);
  const clientName = order.profiles?.company_name || order.profiles?.full_name || 'Particular';
  const clientEmail = order.profiles?.email || '';
  const clientPhone = order.profiles?.phone || '';
  
  doc.text(clientName, margin, 62);
  doc.text(clientEmail, margin, 67);
  doc.text(clientPhone, margin, 72);

  // --- IMAGEN DEL PROYECTO (Si existe) ---
  let startY = 85;
  if (order.projects?.thumbnail_url) {
    try {
        // Intentamos cargar la imagen (debe permitir CORS tu bucket de Supabase)
        const img = new Image();
        img.src = order.projects.thumbnail_url;
        img.crossOrigin = "Anonymous";
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; }); // Esperar carga
        
        // Dibujar imagen (ajustando tamaño)
        doc.addImage(img, 'JPEG', 120, 50, 60, 40); // x, y, w, h
    } catch (e) {
        console.warn("No se pudo cargar la imagen para el PDF", e);
    }
  }

  // --- TABLA DE ITEMS ---
  const tableRows = [];

  // 1. Items 3D
  items3D.forEach(item => {
    tableRows.push([
        item.name,
        'Diseño 3D',
        item.quantity,
        PriceCalculator.formatMoney(item.unitPrice || item.price)
    ]);
  });

  // 2. Items Manuales
  manualItems.forEach(item => {
    tableRows.push([
        item.name + (item.dimensions ? ` (${item.dimensions})` : ''),
        'Extra Manual',
        item.quantity,
        PriceCalculator.formatMoney(item.total_price)
    ]);
  });

  // @ts-ignore
  autoTable(doc, {
    startY: startY,
    head: [['Concepto', 'Tipo', 'Cant.', 'Precio Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 },
    columnStyles: { 3: { halign: 'right' } } // Alinear precio a la derecha
  });

  // --- TOTALES ---
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 10;
  
  // Recalcular base para mostrar en PDF
  // Ojo: Usamos los valores actuales del pedido que se van a guardar
  const finalPrice = order.total_price;
  const discount = order.profiles?.discount_rate || 0;
  let basePrice = finalPrice;
  
  if (discount > 0 && finalPrice > 0) {
      basePrice = finalPrice / (1 - (discount / 100));
  } else if (finalPrice === 0) {
      // Si por alguna razón es 0, sumamos los items
      // (Lógica simplificada para el PDF)
      basePrice = items3D.reduce((a,b) => a + b.totalPrice, 0) + manualItems.reduce((a,b) => a + b.total_price, 0);
  }

  doc.setFontSize(10);
  doc.setTextColor(0);
  
  // Alinear a la derecha (aprox x=140)
  doc.text(`Subtotal:`, 140, finalY);
  doc.text(PriceCalculator.formatMoney(basePrice), 190, finalY, { align: 'right' });
  
  if (discount > 0) {
      finalY += 7;
      doc.setTextColor(230, 126, 34); // Naranja
      doc.text(`Descuento Cliente (${discount}%):`, 140, finalY);
      doc.text(`-${PriceCalculator.formatMoney(basePrice - finalPrice)}`, 190, finalY, { align: 'right' });
  }

  finalY += 10;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL:`, 140, finalY);
  doc.setTextColor(41, 128, 185); // Azul
  doc.text(PriceCalculator.formatMoney(finalPrice), 190, finalY, { align: 'right' });

  // --- PIE DE PAGINA ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text("Este presupuesto tiene una validez de 15 días.", margin, 280);

  // Devolver como Blob para subir a Supabase
  return doc.output('blob');
};