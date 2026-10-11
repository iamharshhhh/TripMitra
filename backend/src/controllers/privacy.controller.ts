import { asyncHandler } from "../utils/asyncHandler.js";

export class PrivacyController {
    static getPrivacyPolicy = asyncHandler((_req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; script-src 'none'");
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — TripMitra</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --bg-page: #f8fafc;
      --bg-card: #ffffff;
      --border: #e2e8f0;
      --badge-bg: #eff6ff;
      --badge-text: #1d4ed8;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg-page);
      color: var(--text-main);
      line-height: 1.65;
      padding: 40px 20px;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: var(--bg-card);
      border-radius: 12px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      padding: 48px;
    }
    @media (max-width: 640px) {
      .container {
        padding: 24px;
      }
      body {
        padding: 16px 8px;
      }
    }
    .header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .badge {
      display: inline-block;
      background: var(--badge-bg);
      color: var(--badge-text);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 2rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 8px;
    }
    .meta-info {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin-top: 32px;
      margin-bottom: 12px;
      border-left: 4px solid var(--primary);
      padding-left: 12px;
    }
    p {
      margin-bottom: 16px;
      color: #334155;
    }
    ul {
      margin-bottom: 16px;
      padding-left: 24px;
      color: #334155;
    }
    li {
      margin-bottom: 8px;
    }
    strong {
      color: #0f172a;
    }
    .callout {
      background-color: #f1f5f9;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
      border-left: 4px solid #3b82f6;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Official Policy</div>
      <h1>Privacy Policy</h1>
      <div class="meta-info">
        <strong>Service:</strong> TripMitra (AI Travel Companion WhatsApp Bot)<br>
        <strong>Effective Date:</strong> September 12, 2026 &bull; <strong>Version:</strong> 1.0
      </div>
    </div>

    <p>
      This Privacy Policy explains how <strong>TripMitra</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Service&rdquo;) collects, uses, processes, stores, and protects your information when you interact with our automated travel assistant via the WhatsApp messaging platform.
    </p>

    <div class="callout">
      <strong>Core Commitment:</strong> We respect your privacy. We never sell, monetize, or rent your personal data to advertisers or data brokers. All data collected is strictly utilized to provide you with intelligent travel recommendations, localized tourism insights, and conversational trip assistance.
    </div>

    <h2>1. Information We Collect</h2>
    <p>When you message our WhatsApp Tourist Assistant, we collect the following categories of information:</p>
    <ul>
      <li><strong>WhatsApp Account Identifiers:</strong> Your WhatsApp phone number and profile display name, as transmitted securely through the Meta WhatsApp Cloud API.</li>
      <li><strong>Conversational Inquiries & Messages:</strong> The text content of your messages, travel questions, destinations of interest, sightseeing preferences, and scheduling dates you submit to the assistant.</li>
      <li><strong>Travel Preferences:</strong> Explicit preferences you share (e.g., travel style, interests in heritage/culinary/nature spots, preferred pace, or dietary restrictions) to personalize trip advice.</li>
      <li><strong>Technical & Delivery Metadata:</strong> Message timestamps, WhatsApp message IDs, and delivery/read receipts necessary for conversational state tracking and operational reliability.</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>We process your data exclusively for legitimate tourism assistance purposes, including:</p>
    <ul>
      <li>Understanding natural language queries and generating real-time, contextually accurate travel advice.</li>
      <li>Querying our destination knowledge base (using Retrieval-Augmented Generation / RAG) to supply verified historical and cultural facts.</li>
      <li>Executing real-time helper tools (such as live weather forecasts and place searches) to answer dynamic itinerary questions.</li>
      <li>Maintaining multi-turn conversational context so the assistant remembers your previous questions during an active travel planning session.</li>
    </ul>

    <h2>3. Third-Party Integrations & AI Processing</h2>
    <p>To provide conversational intelligence and real-time travel answers, the Service securely connects to reputable third-party infrastructure:</p>
    <ul>
      <li><strong>Meta Platforms (WhatsApp Cloud API):</strong> Message transport is provided by Meta in accordance with Meta&rsquo;s Commercial and Cloud API terms. End-to-end transport between Meta and our backend utilizes encrypted HTTPS/TLS webhooks.</li>
      <li><strong>Google Gemini AI:</strong> User travel queries and relevant destination excerpts are processed via Google Gemini API endpoints (such as <code>gemini-3.6-flash</code> for conversational reasoning and <code>gemini-embedding-2</code> for semantic destination retrieval) in accordance with Google&rsquo;s applicable API Terms of Service and Privacy Policy.</li>
      <li><strong>External Meteorological &amp; Places APIs:</strong> Inquiries requiring dynamic data invoke external APIs (e.g., Open-Meteo for meteorological forecasts and Google Places API for points of interest). Only sanitized geographic queries (e.g., &ldquo;Pune weather&rdquo; or &ldquo;historical places in Pune&rdquo;) are submitted; your phone number, identity, and personal messages are never transmitted to these external tools.</li>
    </ul>

    <h2>4. Data Storage &amp; Security</h2>
    <p>We implement appropriate organizational and technical safeguards:</p>
    <ul>
      <li><strong>Database Storage:</strong> User records, conversations, message logs, and travel preferences are stored in MongoDB Atlas database clusters with encryption-at-rest and TLS encryption-in-transit.</li>
      <li><strong>No Secret Exposure:</strong> All backend API tokens, encryption keys, and credentials reside strictly in protected server environment configurations and are never exposed in client-facing responses or public logs.</li>
      <li><strong>Access Restrictions:</strong> Access to backend services and databases is restricted by IP access controls and authenticated credentials.</li>
    </ul>

    <h2>5. Data Retention &amp; Erasure</h2>
    <p>
      We retain conversational data only as long as necessary to facilitate ongoing trip planning sessions and maintain service quality.
    </p>
    <ul>
      <li><strong>Right to Deletion (Right to be Forgotten):</strong> You may request complete erasure of your conversation history, user profile, and stored travel preferences at any time by contacting our privacy contact email with your WhatsApp phone number. We will process deletion requests promptly upon receipt.</li>
      <li><strong>Data Portability &amp; Access:</strong> You have the right to request a summary copy of the personal information and preferences associated with your phone number.</li>
    </ul>

    <h2>6. Children&rsquo;s Privacy</h2>
    <p>
      Our Service is not targeted towards or intended for use by children under the age of 13 (or under the minimum legal age in your jurisdiction). We do not knowingly collect personal data from children.
    </p>

    <h2>7. Policy Updates</h2>
    <p>
      We may occasionally update this Privacy Policy to reflect enhancements in service capabilities or regulatory standards. The current version will always remain accessible at this public URL with the effective date noted above.
    </p>

    <h2>8. Contact Information</h2>
    <p>
      If you have questions, feedback, or data privacy requests regarding the TripMitra WhatsApp assistant, please contact:
    </p>
    <ul>
      <li><strong>Email:</strong> privacy@aitravelcompanion.example.com</li>
      <li><strong>Project:</strong> TripMitra &bull; WhatsApp Tourist Bot Operations</li>
      <li><strong>Inquiries &amp; Deletion Requests:</strong> Please email us directly with your WhatsApp phone number to request data access or account deletion.</li>
    </ul>

    <div class="footer">
      &copy; 2026 TripMitra. All rights reserved. &bull; Operating on WhatsApp Cloud API
    </div>
  </div>
</body>
</html>`;
        res.status(200).send(html);
    });
}
