const { getConnection } = require('../config/database');

/**
 * GET /api/admin/dashboard
 * Returns platform-wide totals for the admin dashboard.
 */
async function getDashboardStats(req, res) {
  let connection;
  try {
    connection = await getConnection();

    const [users, sites, guides, bookings, events, payments] = await Promise.all([
      connection.execute(`SELECT COUNT(*) AS TOTAL FROM USERS WHERE ROLE = 'TOURIST'`),
      connection.execute(`SELECT COUNT(*) AS TOTAL FROM HERITAGE_SITES`),
      connection.execute(`SELECT COUNT(*) AS TOTAL FROM TOUR_GUIDES`),
      connection.execute(`SELECT COUNT(*) AS TOTAL FROM BOOKINGS`),
      connection.execute(`SELECT COUNT(*) AS TOTAL FROM EVENTS`),
      connection.execute(`SELECT COUNT(*) AS TOTAL FROM PAYMENTS WHERE PAYMENT_STATUS = 'SUCCESS'`)
    ]);

    return res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully.',
      data: {
        total_tourists: users.rows[0].TOTAL,
        total_heritage_sites: sites.rows[0].TOTAL,
        total_tour_guides: guides.rows[0].TOTAL,
        total_bookings: bookings.rows[0].TOTAL,
        total_events: events.rows[0].TOTAL,
        total_successful_payments: payments.rows[0].TOTAL
      }
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard statistics.' });
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
 * GET /api/admin/users
 * Returns all users in the system (passwords excluded).
 */
async function getAllUsers(req, res) {
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT USER_ID, NAME, EMAIL, PHONE, ROLE FROM USERS ORDER BY USER_ID`
    );

    const users = result.rows.map((row) => ({
      user_id: row.USER_ID,
      name: row.NAME,
      email: row.EMAIL,
      phone: row.PHONE,
      role: row.ROLE
    }));

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully.',
      data: users
    });
  } catch (err) {
    console.error('Get all users error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
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
 * GET /api/admin/bookings
 * Returns every booking in the system, joined with site, guide, tourist
 * and payment info.
 */
async function getAllBookings(req, res) {
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT b.BOOKING_ID, b.TOURIST_ID, b.SITE_ID, b.GUIDE_ID, b.BOOKING_DATE, b.VISIT_DATE,
              b.NUMBER_OF_TICKETS, b.BOOKING_STATUS,
              s.SITE_NAME, s.TICKET_PRICE,
              tu.NAME AS TOURIST_NAME,
              gu.NAME AS GUIDE_NAME,
              p.PAYMENT_STATUS, p.PAYMENT_METHOD, p.AMOUNT AS PAID_AMOUNT
       FROM BOOKINGS b
       JOIN HERITAGE_SITES s ON b.SITE_ID = s.SITE_ID
       JOIN TOURISTS t ON b.TOURIST_ID = t.TOURIST_ID
       JOIN USERS tu ON t.USER_ID = tu.USER_ID
       JOIN TOUR_GUIDES g ON b.GUIDE_ID = g.GUIDE_ID
       JOIN USERS gu ON g.USER_ID = gu.USER_ID
       LEFT JOIN PAYMENTS p ON p.BOOKING_ID = b.BOOKING_ID
       ORDER BY b.BOOKING_DATE DESC`
    );

    const bookings = result.rows.map((row) => ({
      booking_id: row.BOOKING_ID,
      tourist_id: row.TOURIST_ID,
      tourist_name: row.TOURIST_NAME,
      site_id: row.SITE_ID,
      site_name: row.SITE_NAME,
      guide_id: row.GUIDE_ID,
      guide_name: row.GUIDE_NAME,
      booking_date: row.BOOKING_DATE,
      visit_date: row.VISIT_DATE,
      number_of_tickets: row.NUMBER_OF_TICKETS,
      booking_status: row.BOOKING_STATUS,
      amount: row.PAID_AMOUNT != null ? row.PAID_AMOUNT : row.TICKET_PRICE * row.NUMBER_OF_TICKETS,
      payment_status: row.PAYMENT_STATUS || 'NOT_PAID',
      payment_method: row.PAYMENT_METHOD
    }));

    return res.status(200).json({
      success: true,
      message: 'All bookings retrieved successfully.',
      data: bookings
    });
  } catch (err) {
    console.error('Get all bookings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve bookings.' });
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
 * GET /api/admin/reports
 * Returns basic aggregate reports: revenue, bookings by status, and
 * bookings per heritage site.
 */
async function getReports(req, res) {
  let connection;
  try {
    connection = await getConnection();

    const revenueResult = await connection.execute(
      `SELECT NVL(SUM(AMOUNT), 0) AS TOTAL_REVENUE FROM PAYMENTS WHERE PAYMENT_STATUS = 'SUCCESS'`
    );

    const statusResult = await connection.execute(
      `SELECT BOOKING_STATUS, COUNT(*) AS TOTAL FROM BOOKINGS GROUP BY BOOKING_STATUS`
    );

    const siteResult = await connection.execute(
      `SELECT s.SITE_NAME, COUNT(b.BOOKING_ID) AS TOTAL_BOOKINGS
       FROM HERITAGE_SITES s
       LEFT JOIN BOOKINGS b ON b.SITE_ID = s.SITE_ID
       GROUP BY s.SITE_NAME
       ORDER BY TOTAL_BOOKINGS DESC`
    );

    return res.status(200).json({
      success: true,
      message: 'Reports generated successfully.',
      data: {
        total_revenue: revenueResult.rows[0].TOTAL_REVENUE,
        bookings_by_status: statusResult.rows.map((row) => ({
          status: row.BOOKING_STATUS,
          total: row.TOTAL
        })),
        bookings_by_site: siteResult.rows.map((row) => ({
          site_name: row.SITE_NAME,
          total_bookings: row.TOTAL_BOOKINGS
        }))
      }
    });
  } catch (err) {
    console.error('Get reports error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate reports.' });
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
  getDashboardStats,
  getAllUsers,
  getAllBookings,
  getReports
};
