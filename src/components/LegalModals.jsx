import { useState } from 'react';
import { X } from 'lucide-react';

export function PrivacyPolicyModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Privacy Policy">
      <div className="modal" style={{ maxWidth: 680, maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">🔒 Privacy Policy</div>
          <button className="modal-close" onClick={onClose} aria-label="Close privacy policy"><X size={16} /></button>
        </div>
        <div style={{ fontSize: '.83rem', color: 'var(--ink2)', lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--muted)', fontSize: '.75rem' }}>Last updated: April 2026 · Effective immediately</p>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>1. What We Collect</h3>
            <p>When you create an account, we collect your <strong>name, email address, and password</strong> (stored as a bcrypt hash — never in plain text). The resume data you enter is stored locally in your browser's <code>localStorage</code> and is never uploaded to our servers unless you explicitly use an AI feature.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>2. How We Use Your Data</h3>
            <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Authenticate your account and maintain your session</li>
              <li>Track PDF download usage against your plan quota</li>
              <li>Process promo codes and plan upgrades</li>
              <li>Send resume text to <strong>Google Gemini AI</strong> only when you use the AI Parse or AI Optimize features — this data is not stored by us</li>
            </ul>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>3. Cookies</h3>
            <p>We set one <strong>HttpOnly, Secure cookie</strong> called <code>rf_session</code> to maintain your login session. This cookie expires in 24 hours. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>4. Third-Party Services</h3>
            <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li><strong>Neon (PostgreSQL)</strong> — stores your account data in a secure cloud database</li>
              <li><strong>Google Gemini AI</strong> — processes resume text for AI features; subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Google's Privacy Policy</a></li>
              <li><strong>Vercel</strong> — hosts the application; may log IP addresses for security purposes</li>
            </ul>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>5. Your Rights (GDPR / India IT Act)</h3>
            <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li><strong>Right to Access:</strong> Contact us to request a copy of your data</li>
              <li><strong>Right to Erasure:</strong> Delete your account at any time from your Profile → "Delete Account". This permanently removes all your data from our database.</li>
              <li><strong>Right to Correct:</strong> Update your name/email by contacting us</li>
            </ul>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>6. Data Retention</h3>
            <p>We retain your account data for as long as your account is active. If you delete your account, all associated data is permanently erased from our database within 24 hours.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>7. Contact</h3>
            <p>For privacy-related questions or data requests, contact: <strong>jobinjoseph034@gmail.com</strong></p>
          </section>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={onClose}>Got it</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TermsModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Terms of Service">
      <div className="modal" style={{ maxWidth: 680, maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">📄 Terms of Service</div>
          <button className="modal-close" onClick={onClose} aria-label="Close terms of service"><X size={16} /></button>
        </div>
        <div style={{ fontSize: '.83rem', color: 'var(--ink2)', lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--muted)', fontSize: '.75rem' }}>Last updated: April 2026 · By using CraftCV you agree to these terms.</p>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>1. Acceptance of Terms</h3>
            <p>By creating an account or using CraftCV, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>2. What CraftCV Provides</h3>
            <p>CraftCV is an ATS resume builder tool that helps you create and optimize resumes. The AI optimization feature uses Google Gemini to rewrite experience bullet points. <strong>AI-generated content is a suggestion only</strong> — you are responsible for ensuring accuracy of all information in your resume.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>3. User Responsibilities</h3>
            <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>You must provide accurate information during registration</li>
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You must not attempt to bypass security, rate limits, or payment systems</li>
              <li>You must not upload malicious files or attempt to exploit the service</li>
              <li>You must not misrepresent your qualifications in any resume created using this tool</li>
            </ul>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>4. Free Plan & Pro Plan</h3>
            <p>Free accounts receive a limited number of PDF downloads. Pro accounts receive unlimited downloads. Plan limits are enforced server-side. Attempting to circumvent limits will result in account suspension.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>5. Intellectual Property</h3>
            <p>Resume content you create belongs to you. CraftCV's application code, design, and AI prompts are the intellectual property of the creator (Jobin Joseph). You may not copy or redistribute the application.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>6. Limitation of Liability</h3>
            <p>CraftCV is provided "as is" without warranties. We are not responsible for job application outcomes, AI-generated inaccuracies, or data loss. Maximum liability is limited to any amount paid in the last 30 days.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>7. Termination</h3>
            <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time from your Profile settings.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>8. Governing Law</h3>
            <p>These terms are governed by the laws of India. Any disputes will be resolved in the courts of Kerala, India.</p>
          </section>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={onClose}>I Understand</button>
          </div>
        </div>
      </div>
    </div>
  );
}
