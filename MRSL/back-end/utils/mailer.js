// utils/mailer.js
// Sends "Ready for Pickup" notifications via the EmailJS REST API.
// Drop-in replacement for the old nodemailer version — same exported function,
// no browser SDK required (works fine in Node / Render).

const EMAILJS_SERVICE_ID  = "service_hs7b13l";
const EMAILJS_TEMPLATE_ID = "template_d2jm948";
const EMAILJS_PUBLIC_KEY  = "UeLvBj7roHOJyihdC";
const EMAILJS_API_URL     = "https://api.emailjs.com/api/v1.0/email/send";

/**
 * Sends a "Ready for Pickup" email through EmailJS.
 *
 * @param {object} params
 * @param {string} params.to            - Recipient email address
 * @param {string} params.customerName  - Customer's name  → {{customer_name}}
 * @param {string} params.orderType     - "Laundry" | "Water Refilling" → {{order_type}}
 * @param {number} params.orderId       - Order ID  → {{order_id}}
 * @param {number} params.totalPrice    - Total price (numeric) → {{total_price}}
 */
export const sendReadyNotification = async ({
  to,
  customerName,
  orderType,
  orderId,
  totalPrice,
}) => {
  console.log("📧 sendReadyNotification called");
  console.log("📧 To:", to);

  if (!to) {
    throw new Error("Recipient email address (to) is required.");
  }

  const payload = {
    service_id:  EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id:     EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email:      to,
      customer_name: customerName,
      order_type:    orderType,
      order_id:      String(orderId),
      total_price:   String(totalPrice),
    },
  };

  const res = await fetch(EMAILJS_API_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`EmailJS error ${res.status}: ${body}`);
  }

  console.log("✅ Email sent via EmailJS to:", to);
};