import nodemailer from "nodemailer";
import { appConfig } from "../config.js";

let cachedTransporter = null;

const getTransporter = () => {
  if (!appConfig.smtpHost || !appConfig.smtpUser || !appConfig.smtpPass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: appConfig.smtpHost,
      port: appConfig.smtpPort,
      secure: appConfig.smtpSecure,
      auth: {
        user: appConfig.smtpUser,
        pass: appConfig.smtpPass,
      },
    });
  }

  return cachedTransporter;
};

export const sendOrderNotifications = async (order) => {
  const transporter = getTransporter();

  if (!transporter) {
    return { delivered: false };
  }

  await transporter.sendMail({
    from: appConfig.smtpFrom,
    to: appConfig.adminNotificationEmail,
    subject: `New Order ${order.orderId}`,
    text: [
      `A new order was placed for ${order.productName}.`,
      `Customer: ${order.customerName}`,
      `Phone: ${order.phone}`,
      `Payment: ${order.paymentMethod} (${order.paymentStatus})`,
      `Total: INR ${order.price}`,
    ].join("\n"),
  });

  await transporter.sendMail({
    from: appConfig.smtpFrom,
    to: order.email,
    subject: `Order Confirmation ${order.orderId}`,
    text: [
      `Hi ${order.customerName},`,
      `Your order for ${order.productName} has been received by Elite Empressions.`,
      `Current status: ${order.orderStatus}`,
      `Payment status: ${order.paymentStatus}`,
    ].join("\n"),
  });

  return { delivered: true };
};
