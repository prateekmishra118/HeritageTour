const oracledb = require('oracledb');
const { getConnection } = require('../config/database');

/**
 * POST /api/bookings
 * Body: { tourist_id, site_id, guide_id, visit_date, number_of_tickets }
 * Creates a booking in PENDING status, awaiting the assigned guide's response.
 */
async function createBooking(req, res) {
  const { tourist_id, site_id, guide_id, visit_date, number_of_tickets } = req.body;

  if (!tourist_id || !site_id || !guide_id || !visit_date || !number_of_tickets) {
    return res.status(400).json({
      success: false,
      message: 'tourist_id, site_id, guide_id, visit_date and number_of_tickets are all required.'
    });
  }

  if (Number(number_of_tickets) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'number_of_tickets must be greater than zero.'
    });
  }

  let connection;
  try {
    connection = await getConnection();

    const siteResult = await connection.execute(
      `SELECT SITE_ID, TICKET_PRICE FROM HERITAGE_SITES WHERE SITE_ID = :site_id`,
      { site_id }
    );
    if (siteResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Heritage site not found.' });
    }

    const guideResult = await connection.execute(
      `SELECT GUIDE_ID FROM TOUR_GUIDES WHERE GUIDE_ID = :guide_id`,
      { guide_id }
    );
    if (guideResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tour guide not found.' });
    }

    const touristResult = await connection.execute(
      `SELECT TOURIST_ID, USER_ID FROM TOURISTS WHERE TOURIST_ID = :tourist_id`,
      { tourist_id }
    );
    if (touristResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tourist not found.' });
    }
    if (req.user && touristResult.rows[0].USER_ID !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'You can only create bookings for your own account.' });
    }

    const insertResult = await connection.execute(
      `INSERT INTO BOOKINGS (TOURIST_ID, SITE_ID, GUIDE_ID, BOOKING_DATE, VISIT_DATE, NUMBER_OF_TICKETS, BOOKING_STATUS)
       VALUES (:tourist_id, :site_id, :guide_id, SYSDATE, TO_DATE(:visit_date, 'YYYY-MM-DD'), :number_of_tickets, 'PENDING')
       RETURNING BOOKING_ID INTO :booking_id`,
      {
        tourist_id,
        site_id,
        guide_id,
        visit_date,
        number_of_tickets,
        booking_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const bookingId = insertResult.outBinds.booking_id[0];
    const ticketPrice = siteResult.rows[0].TICKET_PRICE;
    const amount = ticketPrice * number_of_tickets;

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully. Waiting for the tour guide to accept.',
      data: {
        booking_id: bookingId,
        tourist_id,
        site_id,
        guide_id,
        visit_date,
        number_of_tickets,
        booking_status: 'PENDING',
        amount
      }
    });
  } catch (err) {
    console.error('Create booking error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create booking.' });
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
 * GET /api/bookings/tourist/:touristId
 * Returns the full booking history for a tourist, joined with site,
 * guide and payment info.
 */
async function getBookingsByTourist(req, res) {
  const touristId = parseInt(req.params.touristId, 10);

  if (Number.isNaN(touristId)) {
    return res.status(400).json({ success: false, message: 'Invalid tourist id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    if (req.user && req.user.role === 'TOURIST') {
      const ownerCheck = await connection.execute(
        `SELECT TOURIST_ID FROM TOURISTS WHERE TOURIST_ID = :tourist_id AND USER_ID = :user_id`,
        { tourist_id: touristId, user_id: req.user.user_id }
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'You can only view your own bookings.' });
      }
    }

    const result = await connection.execute(
      `SELECT b.BOOKING_ID, b.SITE_ID, b.GUIDE_ID, b.BOOKING_DATE, b.VISIT_DATE,
              b.NUMBER_OF_TICKETS, b.BOOKING_STATUS,
              s.SITE_NAME, s.LOCATION, s.TICKET_PRICE,
              gu.NAME AS GUIDE_NAME,
              p.PAYMENT_ID, p.PAYMENT_STATUS, p.PAYMENT_METHOD, p.AMOUNT AS PAID_AMOUNT
       FROM BOOKINGS b
       JOIN HERITAGE_SITES s ON b.SITE_ID = s.SITE_ID
       JOIN TOUR_GUIDES g ON b.GUIDE_ID = g.GUIDE_ID
       JOIN USERS gu ON g.USER_ID = gu.USER_ID
       LEFT JOIN PAYMENTS p ON p.BOOKING_ID = b.BOOKING_ID
       WHERE b.TOURIST_ID = :tourist_id
       ORDER BY b.BOOKING_DATE DESC`,
      { tourist_id: touristId }
    );

    const bookings = result.rows.map((row) => ({
      booking_id: row.BOOKING_ID,
      site_id: row.SITE_ID,
      site_name: row.SITE_NAME,
      location: row.LOCATION,
      guide_id: row.GUIDE_ID,
      guide_name: row.GUIDE_NAME,
      booking_date: row.BOOKING_DATE,
      visit_date: row.VISIT_DATE,
      number_of_tickets: row.NUMBER_OF_TICKETS,
      booking_status: row.BOOKING_STATUS,
      amount: row.PAID_AMOUNT != null ? row.PAID_AMOUNT : row.TICKET_PRICE * row.NUMBER_OF_TICKETS,
      payment_id: row.PAYMENT_ID,
      payment_status: row.PAYMENT_STATUS || 'NOT_PAID',
      payment_method: row.PAYMENT_METHOD
    }));

    return res.status(200).json({
      success: true,
      message: 'Booking history retrieved successfully.',
      data: bookings
    });
  } catch (err) {
    console.error('Get bookings by tourist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve booking history.' });
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
 * GET /api/bookings/:id
 * Returns full details for a single booking.
 */
async function getBookingById(req, res) {
  const bookingId = parseInt(req.params.id, 10);

  if (Number.isNaN(bookingId)) {
    return res.status(400).json({ success: false, message: 'Invalid booking id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT b.BOOKING_ID, b.TOURIST_ID, b.SITE_ID, b.GUIDE_ID, b.BOOKING_DATE, b.VISIT_DATE,
              b.NUMBER_OF_TICKETS, b.BOOKING_STATUS,
              s.SITE_NAME, s.LOCATION, s.TICKET_PRICE,
              gu.NAME AS GUIDE_NAME, gu.PHONE AS GUIDE_PHONE,
              tu.NAME AS TOURIST_NAME, tu.EMAIL AS TOURIST_EMAIL,
              p.PAYMENT_ID, p.PAYMENT_STATUS, p.PAYMENT_METHOD, p.AMOUNT AS PAID_AMOUNT, p.PAYMENT_DATE
       FROM BOOKINGS b
       JOIN HERITAGE_SITES s ON b.SITE_ID = s.SITE_ID
       JOIN TOUR_GUIDES g ON b.GUIDE_ID = g.GUIDE_ID
       JOIN USERS gu ON g.USER_ID = gu.USER_ID
       JOIN TOURISTS t ON b.TOURIST_ID = t.TOURIST_ID
       JOIN USERS tu ON t.USER_ID = tu.USER_ID
       LEFT JOIN PAYMENTS p ON p.BOOKING_ID = b.BOOKING_ID
       WHERE b.BOOKING_ID = :booking_id`,
      { booking_id: bookingId }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Booking details retrieved successfully.',
      data: {
        booking_id: row.BOOKING_ID,
        tourist_id: row.TOURIST_ID,
        tourist_name: row.TOURIST_NAME,
        tourist_email: row.TOURIST_EMAIL,
        site_id: row.SITE_ID,
        site_name: row.SITE_NAME,
        location: row.LOCATION,
        guide_id: row.GUIDE_ID,
        guide_name: row.GUIDE_NAME,
        guide_phone: row.GUIDE_PHONE,
        booking_date: row.BOOKING_DATE,
        visit_date: row.VISIT_DATE,
        number_of_tickets: row.NUMBER_OF_TICKETS,
        booking_status: row.BOOKING_STATUS,
        amount: row.PAID_AMOUNT != null ? row.PAID_AMOUNT : row.TICKET_PRICE * row.NUMBER_OF_TICKETS,
        payment_id: row.PAYMENT_ID,
        payment_status: row.PAYMENT_STATUS || 'NOT_PAID',
        payment_method: row.PAYMENT_METHOD,
        payment_date: row.PAYMENT_DATE
      }
    });
  } catch (err) {
    console.error('Get booking by id error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve booking details.' });
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
  createBooking,
  getBookingsByTourist,
  getBookingById
};
