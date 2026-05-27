import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 8000,  // 8s to establish TCP connection
  greetingTimeout: 8000,    // 8s to receive SMTP greeting
  socketTimeout: 15000,     // 15s of inactivity before aborting
});

export const sendReadyNotification = async ({ to, customerName, orderType, orderId, totalPrice }) => {
  console.log("📧 Attempting to send email to:", to);
  console.log("📧 GMAIL_USER:", process.env.GMAIL_USER);
  console.log("📧 GMAIL_APP_PASSWORD set:", !!process.env.GMAIL_APP_PASSWORD);

  const subject = `Your ${orderType} Order #${orderId} is Ready for Pickup!`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Ready</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">

              <!-- Header Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); padding: 36px 40px; text-align: center;">
                  <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; letter-spacing: 2px; color: #bae6fd; text-transform: uppercase;">HydroHUB</p>
                  <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                    Your order is ready!
                  </h1>
                  <p style="margin: 8px 0 0; font-size: 14px; color: #e0f2fe;">Come pick it up at your convenience.</p>
                </td>
              </tr>

              <!-- Status Badge -->
              <tr>
                <td align="center" style="padding: 28px 40px 0;">
                  <span style="display: inline-block; background: #dcfce7; color: #15803d; font-size: 13px; font-weight: 600; padding: 6px 18px; border-radius: 999px; border: 1px solid #bbf7d0; letter-spacing: 0.5px;">
                    &#10003;&nbsp; Ready for Pickup
                  </span>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 20px 40px 8px;">
                  <p style="margin: 0; font-size: 15px; color: #374151;">
                    Hi <strong style="color: #0f172a;">${customerName}</strong>, great news! Your
                    <strong style="color: #0f172a;">${orderType}</strong> order has been processed and
                    is waiting for you at our shop.
                  </p>
                </td>
              </tr>

              <!-- Order Details Card -->
              <tr>
                <td style="padding: 16px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                    <tr>
                      <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Order Details</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size: 13px; color: #64748b;">Order ID</td>
                            <td align="right" style="font-size: 14px; font-weight: 600; color: #0f172a; font-family: monospace;">#${orderId}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size: 13px; color: #64748b;">Order Type</td>
                            <td align="right" style="font-size: 14px; font-weight: 600; color: #0f172a;">${orderType}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size: 13px; color: #64748b;">Total Amount</td>
                            <td align="right" style="font-size: 18px; font-weight: 700; color: #0369a1;">&#8369;${totalPrice}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Note -->
              <tr>
                <td style="padding: 8px 40px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 0;">
                    <tr>
                      <td style="padding: 12px 16px;">
                        <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.6;">
                          Please bring this email or your order ID when you arrive. Our team is ready to assist you!
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding: 0 40px;">
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;" />
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; text-align: center;">
                  <p style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">Thank you for choosing HydroHUB!</p>
                  <p style="margin: 0; font-size: 12px; color: #cbd5e1;">
                    Questions? Reply to this email or visit us in-store.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const sendWithTimeout = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Email send timed out after 20s")),
      20000
    );
    transporter
      .sendMail({
        from: `"HydroHUB" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
      })
      .then((info) => { clearTimeout(timer); resolve(info); })
      .catch((err)  => { clearTimeout(timer); reject(err);  });
  });

  try {
    const info = await sendWithTimeout;
    console.log("✅ Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
    throw error;
  }
};