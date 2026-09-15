const oracledb = require('oracledb');
const { getConnection } = require('../config/database');

const VALID_METHODS = ['UPI', 'CARD', 'NET_BANKING'];

/**
 * POST /api/payments
 * Body: { booking_id, payment_method }
 *
 * Simulated payment gateway flow:
 *   Booking must be in ACCEPTED status (the tour guide already accepted it).
 *   1. A PAYMENTS row is written/updated with status PROCESSING and the
 *      booking is moved to PAYMENT_PROCESSING.
 *   2. The payment outcome is simulated (occasionally fails, to exercise
 *      the failure path).
 *   3. On success: PAYMENTS.PAYMENT_STATUS = SUCCESS, BOOKINGS.BOOKING_STATUS = CONFIRMED.
 *      On failure: PAYMENTS.PAYMENT_STATUS = FAILED, BOOKINGS.BOOKING_STATUS reverts
 *      to ACCEPTED so the tourist can retry payment.
 */
async function processPayment(req, res) {
  const { booking_id, payment_method } = req.body;

  if (!booking_id || !payment_method) {
    return res.status(400).json({
      success: false,
      message: 'booking_id and payment_method are required.'
    });
  }

  if (!VALID_METHODS.includes(payment_method)) {
    return res.status(400).json({
      success: false,
      message: `payment_method must be one of: ${VALID_METHODS.join(', ')}.`
    });
  }

  let connection;
  try {
    connection = await getConnection();

    const bookingResult = await connection.execute(
      `SELECT b.BOOKING_ID, b.BOOKING_STATUS, b.NUMBER_OF_TICKETS, b.TOURIST_ID, s.TICKET_PRICE
       FROM BOOKINGS b
       JOIN HERITAGE_SITES s ON b.SITE_ID = s.SITE_ID
       WHERE b.BOOKING_ID = :booking_id`,
      { booking_id }
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingResult.rows[0];

    if (req.user && req.user.role === 'TOURIST') {
      const ownerCheck = await connection.execute(
        `SELECT TOURIST_ID FROM TOURISTS WHERE TOURIST_ID = :tourist_id AND USER_ID = :user_id`,
        { tourist_id: booking.TOURIST_ID, user_id: req.user.user_id }
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'You can only pay for your own bookings.' });
      }
    }

    if (booking.BOOKING_STATUS === 'CONFIRMED') {
      return res.status(400).json({ success: false, message: 'This booking has already been paid for.' });
    }

    if (booking.BOOKING_STATUS !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'This booking must be accepted by the tour guide before payment can be made.'
      });
    }

    const amount = booking.TICKET_PRICE * booking.NUMBER_OF_TICKETS;

    const existingPayment = await connection.execute(
      `SELECT PAYMENT_ID, PAYMENT_STATUS FROM PAYMENTS WHERE BOOKING_ID = :booking_id`,
      { booking_id }
    );

    let paymentId;

    if (existingPayment.rows.length > 0) {
      if (existingPayment.rows[0].PAYMENT_STATUS === 'SUCCESS') {
        return res.status(400).json({ success: false, message: 'This booking has already been paid for.' });
      }
      paymentId = existingPayment.rows[0].PAYMENT_ID;
      await connection.execute(
        `UPDATE PAYMENTS SET AMOUNT = :amount, PAYMENT_METHOD = :payment_method, PAYMENT_STATUS = 'PROCESSING', PAYMENT_DATE = NULL
         WHERE PAYMENT_ID = :payment_id`,
        { amount, payment_method, payment_id: paymentId }
      );
    } else {
      const insertResult = await connection.execute(
        `INSERT INTO PAYMENTS (BOOKING_ID, AMOUNT, PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_DATE)
         VALUES (:booking_id, :amount, :payment_method, 'PROCESSING', NULL)
         RETURNING PAYMENT_ID INTO :payment_id`,
        {
          booking_id,
          amount,
          payment_method,
          payment_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );
      paymentId = insertResult.outBinds.payment_id[0];
    }

    await connection.execute(
      `UPDATE BOOKINGS SET BOOKING_STATUS = 'PAYMENT_PROCESSING' WHERE BOOKING_ID = :booking_id`,
      { booking_id }
    );

    await connection.commit();

    // Simulate gateway processing latency and outcome (92% success rate)
    const paymentSucceeded = Math.random() < 0.92;
    const finalPaymentStatus = paymentSucceeded ? 'SUCCESS' : 'FAILED';
    const finalBookingStatus = paymentSucceeded ? 'CONFIRMED' : 'ACCEPTED';

    await connection.execute(
      `UPDATE PAYMENTS SET PAYMENT_STATUS = :status, PAYMENT_DATE = SYSDATE WHERE PAYMENT_ID = :payment_id`,
      { status: finalPaymentStatus, payment_id: paymentId }
    );

    await connection.execute(
      `UPDATE BOOKINGS SET BOOKING_STATUS = :status WHERE BOOKING_ID = :booking_id`,
      { status: finalBookingStatus, booking_id }
    );

    await connection.commit();

    return res.status(200).json({
      success: paymentSucceeded,
      message: paymentSucceeded
        ? 'Payment successful. Booking confirmed.'
        : 'Payment failed. Please try again.',
      data: {
        payment_id: paymentId,
        booking_id,
        amount,
        payment_method,
        payment_status: finalPaymentStatus,
        booking_status: finalBookingStatus
      }
    });
  } catch (err) {
    console.error('Process payment error:', err);
    return res.status(500).json({ success: false, message: 'Payment processing failed due to a server error.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err.message);
      }
    }
  }
}

/**
 * GET /api/payments/:bookingId
 * Returns the payment record for a booking, if one exists.
 */
async function getPaymentByBooking(req, res) {
  const bookingId = parseInt(req.params.bookingId, 10);

  if (Number.isNaN(bookingId)) {
    return res.status(400).json({ success: false, message: 'Invalid booking id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT PAYMENT_ID, BOOKING_ID, AMOUNT, PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_DATE
       FROM PAYMENTS WHERE BOOKING_ID = :booking_id`,
      { booking_id: bookingId }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No payment found for this booking.' });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Payment retrieved successfully.',
      data: {
        payment_id: row.PAYMENT_ID,
        booking_id: row.BOOKING_ID,
        amount: row.AMOUNT,
        payment_method: row.PAYMENT_METHOD,
        payment_status: row.PAYMENT_STATUS,
        payment_date: row.PAYMENT_DATE
      }
    });
  } catch (err) {
    console.error('Get payment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payment.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err.message);
      }
    }
  }
}

module.exports = {
  processPayment,
  getPaymentByBooking
};
