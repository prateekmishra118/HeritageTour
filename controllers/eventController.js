const oracledb = require('oracledb');
const { getConnection } = require('../config/database');

/**
 * GET /api/events
 * Returns all events, joined with their heritage site name.
 */
async function getAllEvents(req, res) {
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT e.EVENT_ID, e.SITE_ID, e.EVENT_NAME, e.EVENT_DATE, e.EVENT_TIME, e.DESCRIPTION,
              s.SITE_NAME, s.LOCATION
       FROM EVENTS e
       JOIN HERITAGE_SITES s ON e.SITE_ID = s.SITE_ID
       ORDER BY e.EVENT_DATE`
    );

    const events = result.rows.map((row) => ({
      event_id: row.EVENT_ID,
      site_id: row.SITE_ID,
      site_name: row.SITE_NAME,
      location: row.LOCATION,
      event_name: row.EVENT_NAME,
      event_date: row.EVENT_DATE,
      event_time: row.EVENT_TIME,
      description: row.DESCRIPTION
    }));

    return res.status(200).json({
      success: true,
      message: 'Events retrieved successfully.',
      data: events
    });
  } catch (err) {
    console.error('Get all events error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve events.' });
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
 * GET /api/events/:id
 * Returns a single event's details.
 */
async function getEventById(req, res) {
  const eventId = parseInt(req.params.id, 10);

  if (Number.isNaN(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT e.EVENT_ID, e.SITE_ID, e.EVENT_NAME, e.EVENT_DATE, e.EVENT_TIME, e.DESCRIPTION,
              s.SITE_NAME, s.LOCATION
       FROM EVENTS e
       JOIN HERITAGE_SITES s ON e.SITE_ID = s.SITE_ID
       WHERE e.EVENT_ID = :event_id`,
      { event_id: eventId }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Event retrieved successfully.',
      data: {
        event_id: row.EVENT_ID,
        site_id: row.SITE_ID,
        site_name: row.SITE_NAME,
        location: row.LOCATION,
        event_name: row.EVENT_NAME,
        event_date: row.EVENT_DATE,
        event_time: row.EVENT_TIME,
        description: row.DESCRIPTION
      }
    });
  } catch (err) {
    console.error('Get event by id error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve event.' });
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
 * POST /api/events/:id/register
 * Body: { tourist_id }
 * Registers a tourist for an event.
 */
async function registerForEvent(req, res) {
  const eventId = parseInt(req.params.id, 10);
  const { tourist_id } = req.body;

  if (Number.isNaN(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }

  if (!tourist_id) {
    return res.status(400).json({ success: false, message: 'tourist_id is required.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const eventResult = await connection.execute(
      `SELECT EVENT_ID FROM EVENTS WHERE EVENT_ID = :event_id`,
      { event_id: eventId }
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (req.user && req.user.role === 'TOURIST') {
      const ownerCheck = await connection.execute(
        `SELECT TOURIST_ID FROM TOURISTS WHERE TOURIST_ID = :tourist_id AND USER_ID = :user_id`,
        { tourist_id, user_id: req.user.user_id }
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'You can only register for events as yourself.' });
      }
    }

    const existing = await connection.execute(
      `SELECT REGISTRATION_ID FROM EVENT_REGISTRATIONS WHERE EVENT_ID = :event_id AND TOURIST_ID = :tourist_id`,
      { event_id: eventId, tourist_id }
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'You are already registered for this event.' });
    }

    const insertResult = await connection.execute(
      `INSERT INTO EVENT_REGISTRATIONS (EVENT_ID, TOURIST_ID, REGISTRATION_DATE)
       VALUES (:event_id, :tourist_id, SYSDATE)
       RETURNING REGISTRATION_ID INTO :registration_id`,
      {
        event_id: eventId,
        tourist_id,
        registration_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const registrationId = insertResult.outBinds.registration_id[0];
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Successfully registered for the event.',
      data: { registration_id: registrationId, event_id: eventId, tourist_id }
    });
  } catch (err) {
    console.error('Register for event error:', err);
    return res.status(500).json({ success: false, message: 'Failed to register for event.' });
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
 * POST /api/admin/events
 * Admin: creates a new event.
 */
async function createEvent(req, res) {
  const { site_id, event_name, event_date, event_time, description } = req.body;

  if (!site_id || !event_name || !event_date) {
    return res.status(400).json({ success: false, message: 'site_id, event_name and event_date are required.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const siteResult = await connection.execute(
      `SELECT SITE_ID FROM HERITAGE_SITES WHERE SITE_ID = :site_id`,
      { site_id }
    );
    if (siteResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Heritage site not found.' });
    }

    const insertResult = await connection.execute(
      `INSERT INTO EVENTS (SITE_ID, EVENT_NAME, EVENT_DATE, EVENT_TIME, DESCRIPTION)
       VALUES (:site_id, :event_name, TO_DATE(:event_date, 'YYYY-MM-DD'), :event_time, :description)
       RETURNING EVENT_ID INTO :event_id`,
      {
        site_id,
        event_name,
        event_date,
        event_time: event_time || null,
        description: description || null,
        event_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const eventId = insertResult.outBinds.event_id[0];
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data: { event_id: eventId, site_id, event_name, event_date, event_time, description }
    });
  } catch (err) {
    console.error('Create event error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create event.' });
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
 * PUT /api/admin/events/:id
 * Admin: updates an event.
 */
async function updateEvent(req, res) {
  const eventId = parseInt(req.params.id, 10);
  const { site_id, event_name, event_date, event_time, description } = req.body;

  if (Number.isNaN(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }

  if (!site_id || !event_name || !event_date) {
    return res.status(400).json({ success: false, message: 'site_id, event_name and event_date are required.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `UPDATE EVENTS
       SET SITE_ID = :site_id, EVENT_NAME = :event_name, EVENT_DATE = TO_DATE(:event_date, 'YYYY-MM-DD'),
           EVENT_TIME = :event_time, DESCRIPTION = :description
       WHERE EVENT_ID = :event_id`,
      {
        site_id,
        event_name,
        event_date,
        event_time: event_time || null,
        description: description || null,
        event_id: eventId
      }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: { event_id: eventId, site_id, event_name, event_date, event_time, description }
    });
  } catch (err) {
    console.error('Update event error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update event.' });
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
 * DELETE /api/admin/events/:id
 * Admin: deletes an event.
 */
async function deleteEvent(req, res) {
  const eventId = parseInt(req.params.id, 10);

  if (Number.isNaN(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    await connection.execute(
      `DELETE FROM EVENT_REGISTRATIONS WHERE EVENT_ID = :event_id`,
      { event_id: eventId }
    );

    const result = await connection.execute(
      `DELETE FROM EVENTS WHERE EVENT_ID = :event_id`,
      { event_id: eventId }
    );

    if (result.rowsAffected === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    await connection.commit();

    return res.status(200).json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('Delete event error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete event.' });
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
  getAllEvents,
  getEventById,
  registerForEvent,
  createEvent,
  updateEvent,
  deleteEvent
};
