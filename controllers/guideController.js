const { getConnection } = require('../config/database');

/**
 * GET /api/guides
 * Returns all tour guides joined with their USERS info.
 * Optional ?availability=AVAILABLE filter.
 */
async function getAllGuides(req, res) {
  const { availability } = req.query;

  let connection;
  try {
    connection = await getConnection();

    let query = `
      SELECT g.GUIDE_ID, g.USER_ID, u.NAME, u.EMAIL, u.PHONE, g.EXPERIENCE, g.LANGUAGE, g.AVAILABILITY
      FROM TOUR_GUIDES g
      JOIN USERS u ON g.USER_ID = u.USER_ID
    `;
    const binds = {};

    if (availability) {
      query += ` WHERE g.AVAILABILITY = :availability`;
      binds.availability = availability;
    }

    query += ` ORDER BY u.NAME`;

    const result = await connection.execute(query, binds);

    const guides = result.rows.map((row) => ({
      guide_id: row.GUIDE_ID,
      user_id: row.USER_ID,
      name: row.NAME,
      email: row.EMAIL,
      phone: row.PHONE,
      experience: row.EXPERIENCE,
      language: row.LANGUAGE,
      availability: row.AVAILABILITY
    }));

    return res.status(200).json({
      success: true,
      message: 'Tour guides retrieved successfully.',
      data: guides
    });
  } catch (err) {
    console.error('Get all guides error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tour guides.'
    });
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
 * GET /api/guides/:id
 * Returns a single guide's profile by GUIDE_ID.
 */
async function getGuideById(req, res) {
  const guideId = parseInt(req.params.id, 10);

  if (Number.isNaN(guideId)) {
    return res.status(400).json({ success: false, message: 'Invalid guide id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT g.GUIDE_ID, g.USER_ID, u.NAME, u.EMAIL, u.PHONE, g.EXPERIENCE, g.LANGUAGE, g.AVAILABILITY
       FROM TOUR_GUIDES g
       JOIN USERS u ON g.USER_ID = u.USER_ID
       WHERE g.GUIDE_ID = :guide_id`,
      { guide_id: guideId }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tour guide not found.' });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Tour guide retrieved successfully.',
      data: {
        guide_id: row.GUIDE_ID,
        user_id: row.USER_ID,
        name: row.NAME,
        email: row.EMAIL,
        phone: row.PHONE,
        experience: row.EXPERIENCE,
        language: row.LANGUAGE,
        availability: row.AVAILABILITY
      }
    });
  } catch (err) {
    console.error('Get guide by id error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tour guide.' });
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
 * GET /api/guides/profile/:userId
 * Returns a guide's profile looked up by their USERS.USER_ID.
 * Used right after login to load the guide dashboard.
 */
async function getGuideProfileByUserId(req, res) {
  const userId = parseInt(req.params.userId, 10);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT g.GUIDE_ID, g.USER_ID, u.NAME, u.EMAIL, u.PHONE, g.EXPERIENCE, g.LANGUAGE, g.AVAILABILITY
       FROM TOUR_GUIDES g
       JOIN USERS u ON g.USER_ID = u.USER_ID
       WHERE g.USER_ID = :user_id`,
      { user_id: userId }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tour guide profile not found.' });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Tour guide profile retrieved successfully.',
      data: {
        guide_id: row.GUIDE_ID,
        user_id: row.USER_ID,
        name: row.NAME,
        email: row.EMAIL,
        phone: row.PHONE,
        experience: row.EXPERIENCE,
        language: row.LANGUAGE,
        availability: row.AVAILABILITY
      }
    });
  } catch (err) {
    console.error('Get guide profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tour guide profile.' });
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
 * PUT /api/guides/:id/availability
 * Body: { availability: 'AVAILABLE' | 'UNAVAILABLE' }
 */
async function updateAvailability(req, res) {
  const guideId = parseInt(req.params.id, 10);
  const { availability } = req.body;

  if (Number.isNaN(guideId)) {
    return res.status(400).json({ success: false, message: 'Invalid guide id.' });
  }

  if (!availability || !['AVAILABLE', 'UNAVAILABLE'].includes(availability)) {
    return res.status(400).json({
      success: false,
      message: "availability must be 'AVAILABLE' or 'UNAVAILABLE'."
    });
  }

  let connection;
  try {
    connection = await getConnection();

    if (req.user && req.user.role === 'TOUR_GUIDE') {
      const ownerCheck = await connection.execute(
        `SELECT GUIDE_ID FROM TOUR_GUIDES WHERE GUIDE_ID = :guide_id AND USER_ID = :user_id`,
        { guide_id: guideId, user_id: req.user.user_id }
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'You can only update your own availability.' });
      }
    }

    const result = await connection.execute(
      `UPDATE TOUR_GUIDES SET AVAILABILITY = :availability WHERE GUIDE_ID = :guide_id`,
      { availability, guide_id: guideId }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Tour guide not found.' });
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Availability updated successfully.',
      data: { guide_id: guideId, availability }
    });
  } catch (err) {
    console.error('Update availability error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update availability.' });
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
 * GET /api/guides/:id/bookings
 * Returns all bookings assigned to a guide, joined with site and tourist info.
 */
async function getGuideBookings(req, res) {
  const guideId = parseInt(req.params.id, 10);

  if (Number.isNaN(guideId)) {
    return res.status(400).json({ success: false, message: 'Invalid guide id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT b.BOOKING_ID, b.TOURIST_ID, b.SITE_ID, b.GUIDE_ID, b.BOOKING_DATE, b.VISIT_DATE,
              b.NUMBER_OF_TICKETS, b.BOOKING_STATUS,
              s.SITE_NAME, s.LOCATION, s.TICKET_PRICE,
              u.NAME AS TOURIST_NAME, u.PHONE AS TOURIST_PHONE
       FROM BOOKINGS b
       JOIN HERITAGE_SITES s ON b.SITE_ID = s.SITE_ID
       JOIN TOURISTS t ON b.TOURIST_ID = t.TOURIST_ID
       JOIN USERS u ON t.USER_ID = u.USER_ID
       WHERE b.GUIDE_ID = :guide_id
       ORDER BY b.BOOKING_DATE DESC`,
      { guide_id: guideId }
    );

    const bookings = result.rows.map((row) => ({
      booking_id: row.BOOKING_ID,
      tourist_id: row.TOURIST_ID,
      tourist_name: row.TOURIST_NAME,
      tourist_phone: row.TOURIST_PHONE,
      site_id: row.SITE_ID,
      site_name: row.SITE_NAME,
      location: row.LOCATION,
      guide_id: row.GUIDE_ID,
      booking_date: row.BOOKING_DATE,
      visit_date: row.VISIT_DATE,
      number_of_tickets: row.NUMBER_OF_TICKETS,
      booking_status: row.BOOKING_STATUS,
      amount: row.TICKET_PRICE * row.NUMBER_OF_TICKETS
    }));

    return res.status(200).json({
      success: true,
      message: 'Assigned bookings retrieved successfully.',
      data: bookings
    });
  } catch (err) {
    console.error('Get guide bookings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assigned bookings.' });
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
 * PUT /api/guides/bookings/:bookingId/accept
 * A guide accepts a PENDING booking assigned to them. Moves it to ACCEPTED,
 * which unlocks payment for the tourist.
 */
async function acceptBooking(req, res) {
  return respondToBooking(req, res, 'ACCEPTED');
}

/**
 * PUT /api/guides/bookings/:bookingId/reject
 * A guide rejects a PENDING booking assigned to them.
 */
async function rejectBooking(req, res) {
  return respondToBooking(req, res, 'REJECTED');
}

async function respondToBooking(req, res, newStatus) {
  const bookingId = parseInt(req.params.bookingId, 10);

  if (Number.isNaN(bookingId)) {
    return res.status(400).json({ success: false, message: 'Invalid booking id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const bookingResult = await connection.execute(
      `SELECT BOOKING_ID, GUIDE_ID, BOOKING_STATUS FROM BOOKINGS WHERE BOOKING_ID = :booking_id`,
      { booking_id: bookingId }
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingResult.rows[0];

    if (req.user && req.user.role === 'TOUR_GUIDE') {
      const ownerCheck = await connection.execute(
        `SELECT GUIDE_ID FROM TOUR_GUIDES WHERE GUIDE_ID = :guide_id AND USER_ID = :user_id`,
        { guide_id: booking.GUIDE_ID, user_id: req.user.user_id }
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'This booking is not assigned to you.' });
      }
    }

    if (booking.BOOKING_STATUS !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `This booking has already been ${booking.BOOKING_STATUS.toLowerCase()} and cannot be updated.`
      });
    }

    await connection.execute(
      `UPDATE BOOKINGS SET BOOKING_STATUS = :status WHERE BOOKING_ID = :booking_id`,
      { status: newStatus, booking_id: bookingId }
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Booking ${newStatus === 'ACCEPTED' ? 'accepted' : 'rejected'} successfully.`,
      data: { booking_id: bookingId, booking_status: newStatus }
    });
  } catch (err) {
    console.error('Respond to booking error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update booking status.' });
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
  getAllGuides,
  getGuideById,
  getGuideProfileByUserId,
  updateAvailability,
  getGuideBookings,
  acceptBooking,
  rejectBooking
};
