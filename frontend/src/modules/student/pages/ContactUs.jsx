import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiMail, FiMessageCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { contactAPI } from '../services/api';

/**
 * Contact Us Page
 * Allows users to send messages to support
 */
const ContactUs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contactInfo, setContactInfo] = useState(null);
  const [isLoadingContact, setIsLoadingContact] = useState(true);
  const [contactError, setContactError] = useState('');
  const [formData, setFormData] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        setIsLoadingContact(true);
        setContactError('');

        const response = await contactAPI.getContactInfo();
        if (response.success && response.data?.items?.length) {
          // For now we use the first active contact entry
          setContactInfo(response.data.items[0]);
        } else {
          setContactError('Unable to load contact details. Please try again later.');
        }
      } catch (error) {
        setContactError(error.message || 'Unable to load contact details. Please try again later.');
      } finally {
        setIsLoadingContact(false);
      }
    };

    fetchContactInfo();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // For now we just simulate sending a message on client side
    // In future, this can be wired to a backend contact-form endpoint.
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Message sent successfully! Our support team will get back to you soon.');
      navigate(ROUTES.PROFILE);
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full bg-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[var(--app-teal)] to-[var(--app-teal)]/90 shadow-md sticky top-0 z-10 rounded-b-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 md:py-5 flex items-center gap-4">
          <button
            onClick={() => navigate(ROUTES.PROFILE)}
            className="p-2 hover:bg-[var(--app-teal)]/80 rounded-full transition-colors"
          >
            <FiArrowLeft className="text-[var(--app-white)] text-xl" />
          </button>
          <h1 className="text-xl font-bold text-[var(--app-white)]">
            Contact Us
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 pb-24 space-y-6">
        {/* Contact Details Card (from backend) */}
        <div className="bg-[var(--app-white)] rounded-3xl shadow-2xl p-5 md:p-6 -mt-4">
          {isLoadingContact ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ) : contactError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
              {contactError}
            </div>
          ) : contactInfo ? (
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-[var(--app-black)]">
                {contactInfo.title || 'Contact Support'}
              </h2>
              {contactInfo.subtitle && (
                <p className="text-sm text-[var(--app-black)]/70">
                  {contactInfo.subtitle}
                </p>
              )}

              <div className="mt-2 space-y-2 text-sm text-[var(--app-black)]/80">
                {contactInfo.email && (
                  <p>
                    <span className="font-semibold">Email:</span>{' '}
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="text-[var(--app-teal)] underline"
                    >
                      {contactInfo.email}
                    </a>
                  </p>
                )}
                {contactInfo.phone && (
                  <p>
                    <span className="font-semibold">Phone:</span>{' '}
                    <a
                      href={`tel:${contactInfo.phone}`}
                      className="text-[var(--app-teal)] underline"
                    >
                      {contactInfo.phone}
                    </a>
                  </p>
                )}
                {contactInfo.whatsapp && (
                  <p>
                    <span className="font-semibold">WhatsApp:</span>{' '}
                    <a
                      href={`https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--app-teal)] underline"
                    >
                      {contactInfo.whatsapp}
                    </a>
                  </p>
                )}
                {contactInfo.supportHours && (
                  <p>
                    <span className="font-semibold">Support Hours:</span>{' '}
                    {contactInfo.supportHours}
                  </p>
                )}
                {contactInfo.address && (
                  <p>
                    <span className="font-semibold">Address:</span>{' '}
                    {contactInfo.address}
                  </p>
                )}
                {contactInfo.additionalNotes && (
                  <p className="text-xs text-[var(--app-black)]/60 mt-1">
                    {contactInfo.additionalNotes}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Contact Form Card */}
        <div className="bg-[var(--app-white)] rounded-3xl shadow-2xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm text-[var(--app-black)]/70 mb-2 ml-1">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <FiUser className="text-[var(--app-teal)] text-xl" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[var(--app-black)]/10 bg-[var(--app-beige)]/30 focus:outline-none focus:border-[var(--app-teal)] focus:bg-[var(--app-white)] transition-all text-[var(--app-black)]"
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm text-[var(--app-black)]/70 mb-2 ml-1">
                Your Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <FiMail className="text-[var(--app-teal)] text-xl" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[var(--app-black)]/10 bg-[var(--app-beige)]/30 focus:outline-none focus:border-[var(--app-teal)] focus:bg-[var(--app-white)] transition-all text-[var(--app-black)]"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Message Field */}
            <div>
              <label className="block text-sm text-[var(--app-black)]/70 mb-2 ml-1">
                Your Message
              </label>
              <div className="relative">
                <div className="absolute left-3 top-4">
                  <FiMessageCircle className="text-[var(--app-teal)] text-xl" />
                </div>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="6"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[var(--app-black)]/10 bg-[var(--app-beige)]/30 focus:outline-none focus:border-[var(--app-teal)] focus:bg-[var(--app-white)] transition-all text-[var(--app-black)] resize-none"
                  placeholder="Enter your message"
                  required
                ></textarea>
              </div>
            </div>

            {/* Send Message Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[var(--app-teal)] to-[var(--app-teal)]/90 text-[var(--app-white)] font-semibold py-4 rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ContactUs;

