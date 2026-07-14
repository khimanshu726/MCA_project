const currency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

/**
 * Builds and downloads a formatted invoice PDF for an order. jspdf is
 * dynamically imported here so it never bloats the main bundle — this only
 * runs when the customer explicitly clicks "Download Invoice".
 */
export async function generateInvoicePdf(order) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const marginX = 48;
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Elite Empressions", marginX, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Tax Invoice", 547 - marginX, y, { align: "right" });

  y += 20;
  doc.setDrawColor(200);
  doc.line(marginX, y, 547, y);
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Order ${order.orderId}`, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Placed on ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, 547 - marginX, y, { align: "right" });

  y += 28;
  doc.setFont("helvetica", "bold");
  doc.text("Delivery address", marginX, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  const addressLines = [
    order.customerName,
    order.phone,
    order.address?.street,
    order.address?.landmark,
    `${order.address?.city || ""}, ${order.address?.state || ""} - ${order.address?.pincode || ""}`,
  ].filter(Boolean);
  addressLines.forEach((line) => {
    doc.text(line, marginX, y);
    y += 14;
  });

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Item", marginX, y);
  doc.text("Qty", 380, y, { align: "right" });
  doc.text("Unit Price", 460, y, { align: "right" });
  doc.text("Total", 547, y, { align: "right" });
  y += 8;
  doc.line(marginX, y, 547, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  (order.lineItems || []).forEach((item) => {
    doc.text(item.name, marginX, y, { maxWidth: 300 });
    doc.text(String(item.quantity), 380, y, { align: "right" });
    doc.text(currency(item.unitPrice), 460, y, { align: "right" });
    doc.text(currency(item.totalPrice), 547, y, { align: "right" });
    y += 18;
  });

  y += 10;
  doc.line(marginX, y, 547, y);
  y += 20;

  const totalsRows = [
    ["Subtotal", order.subtotal],
    ["Platform fee", order.platformFee],
    ["Tax", order.taxAmount],
    ["Shipping", order.shippingCharge],
    order.couponDiscount ? [`Coupon (${order.couponCode})`, -order.couponDiscount] : null,
  ].filter(Boolean);

  totalsRows.forEach(([label, value]) => {
    doc.text(label, 420, y, { align: "right" });
    doc.text(currency(value), 547, y, { align: "right" });
    y += 16;
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", 420, y, { align: "right" });
  doc.text(currency(order.price), 547, y, { align: "right" });

  y += 36;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Payment method: ${order.paymentMethod?.toUpperCase()} | Payment status: ${order.paymentStatus}`, marginX, y);

  doc.save(`invoice-${order.orderId}.pdf`);
}
