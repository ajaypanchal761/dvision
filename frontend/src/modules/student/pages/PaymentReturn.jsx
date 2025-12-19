import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../services/api';
import { ROUTES } from '../constants/routes';

/**
 * Payment Return Page
 * Handles Cashfree payment redirect and verifies payment
 * 
 * IMPORTANT: This page handles return URL verification (user redirect from payment gateway)
 * The server webhook is the PRIMARY verification method for production
 */
const PaymentReturn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getCurrentUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [message, setMessage] = useState('Verifying your payment...');
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Clear payment in progress flag since we're back from payment
        const storedOrderId = localStorage.getItem('payment_order_id');
        localStorage.removeItem('payment_in_progress');
        localStorage.removeItem('payment_order_id');
        localStorage.removeItem('payment_timestamp');

        console.log('Cleared payment flags from localStorage');

        // Get order_id from URL query params (Cashfree returns this)
        const orderId = searchParams.get('order_id') || storedOrderId;

        if (!orderId) {
          setStatus('failed');
          setMessage('Payment verification failed');
          setError('Order ID not found in payment response');
          return;
        }

        // Get other payment details from URL (Cashfree may return these)
        const referenceId = searchParams.get('reference_id') || searchParams.get('payment_id') || searchParams.get('referenceId');
        const paymentSignature = searchParams.get('payment_signature') || searchParams.get('signature');
        const txStatus = searchParams.get('tx_status') || searchParams.get('txStatus');
        const orderAmount = searchParams.get('order_amount') || searchParams.get('orderAmount');

        console.log('Payment return params:', {
          orderId,
          referenceId,
          paymentSignature,
          txStatus,
          orderAmount,
          timestamp: new Date().toISOString()
        });

        // Verify payment with backend
        setStatus('verifying');
        setMessage('Verifying your payment...');

        const verifyResponse = await paymentAPI.verifyPayment(
          orderId,
          referenceId || undefined,
          paymentSignature || undefined,
          txStatus || undefined,
          orderAmount ? parseFloat(orderAmount) : undefined
        );

        console.log('Payment verification response:', verifyResponse);

        if (verifyResponse.success) {
          setStatus('success');
          setMessage('Payment successful! Your subscription has been activated.');

          // Refresh user data to get updated subscription
          try {
            await getCurrentUser();
            console.log('User data refreshed after payment');
          } catch (refreshError) {
            console.error('Error refreshing user data:', refreshError);
            // Don't fail the payment verification if refresh fails
          }

          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate(ROUTES.DASHBOARD);
          }, 3000);
        } else {
          setStatus('failed');
          setMessage('Payment verification failed');
          setError(verifyResponse.message || 'Unable to verify payment. Please contact support.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);

        // Retry logic for transient errors
        if (retryCount < MAX_RETRIES && error.message.includes('Network error')) {
          setMessage(`Retrying payment verification (${retryCount + 1}/${MAX_RETRIES})...`);
          setRetryCount(retryCount + 1);

          // Wait 2 seconds before retry
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }

        setStatus('failed');
        setMessage('Payment verification failed');
        setError(error.message || 'An error occurred while verifying your payment. Please contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, navigate, getCurrentUser, retryCount]);

  const handleRetry = () => {
    setStatus('verifying');
    setMessage('Verifying your payment...');
    setError('');
    setRetryCount(0);
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <FiLoader className="text-6xl text-blue-600 animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-xs text-gray-500 mt-4">
              Please do not close this page or refresh. It may take a few seconds...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-75"></div>
                <FiCheckCircle className="relative text-6xl text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            <div className="mt-6">
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="flex justify-center mb-4">
              <FiXCircle className="text-6xl text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-2">{message}</p>
            {error && (
              <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-lg">{error}</p>
            )}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Retry Payment
              </button>
              <button
                onClick={() => navigate(ROUTES.SUBSCRIPTION_PLANS)}
                className="w-full border-2 border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                Back to Plans
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Note: The payment gateway server has been notified. Your subscription will be activated automatically if payment was successful.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentReturn;


