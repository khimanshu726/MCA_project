import express from "express";
import {
  sendAdminOrderEmail,
  sendDeliveryEmail,
  sendOrderConfirmation,
  sendPaymentFailed,
  sendPaymentSuccess,
  sendShipmentEmail,
  sendWelcomeEmail,
} from "../services/email/resendService.js";

/**
 * Development-only email tester. Mounted at /api/dev ONLY when
 * NODE_ENV !== "production" (see index.js), so it can never be reached on the
 * live site. Lets you fire any branded template at an address to eyeball it in
 * a real inbox.
 */
const router = express.Router();

const sampleOrder = (email) => ({
  id: "sample",
  orderId: "EE-TEST-1234",
  customerName: "Test Customer",
  email,
  phone: "9876543210",
  address: { street: "221B Baker Street", landmark: "Near Central Park", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  lineItems: [
    { name: "Premium Business Cards", quantity: 250, unitPrice: 2, totalPrice: 500, customizationText: "Matte finish, rounded corners" },
    { name: "Storefront Banner (6ft)", quantity: 1, unitPrice: 700, totalPrice: 700 },
  ],
  quantity: 251,
  subtotal: 1300,
  discountTotal: 100,
  shippingCharge: 0,
  price: 1200,
  couponCode: "SAVE100",
  paymentMethod: "card",
  paymentStatus: "Paid",
  razorpayPaymentId: "pay_TEST123456",
  orderStatus: "Placed",
  courier: "Delhivery",
  trackingId: "DLV123456789IN",
  expectedDeliveryDate: new Date(Date.now() + 5 * 86400000),
});

router.post("/test-email", async (req, res, next) => {
  try {
    const { email, template = "orderConfirmation" } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Body must include an `email`." });
    }

    const order = sampleOrder(email);
    const senders = {
      orderConfirmation: () => sendOrderConfirmation(order),
      paymentSuccess: () => sendPaymentSuccess(order, { razorpayPaymentId: order.razorpayPaymentId }),
      paymentFailed: () => sendPaymentFailed(order, { reason: "Your card was declined (test)." }),
      orderShipped: () => sendShipmentEmail(order),
      orderDelivered: () => sendDeliveryEmail(order),
      welcomeEmail: () => sendWelcomeEmail({ email, username: "Test Customer" }),
      adminNewOrder: () => sendAdminOrderEmail(order),
    };

    const run = senders[template];
    if (!run) {
      return res.status(400).json({ message: `Unknown template "${template}". Choose one of: ${Object.keys(senders).join(", ")}.` });
    }

    const result = await run();
    return res.json({ template, requestedRecipient: email, result });
  } catch (error) {
    return next(error);
  }
});

export default router;
