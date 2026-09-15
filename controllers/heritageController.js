const oracledb = require('oracledb');
const { getConnection } = require('../config/database');

/**
 * GET /api/heritage
 * Returns all heritage sites, optionally filtered by a search term
 * matching site name or location (?search=...).
 */
async function getAllSites(req, res) {
  const { search } = req.query;

  let connection;
  try {
    connection = await getConnection();

    let query = `SELECT SITE_ID, SITE_NAME, LOCATION, DESCRIPTION, OPENING_TIME, CLOSING_TIME, TICKET_PRICE
                 FROM HERITAGE_SITES`;
    const binds = {};

    if (search) {
      query += ` WHERE UPPER(SITE_NAME) LIKE UPPER(:search) OR UPPER(LOCATION) LIKE UPPER(:search)`;
      binds.search = `%${search}%`;
    }

    query += ` ORDER BY SITE_NAME`;

    const result = await connection.execute(query, binds);

    const sites = result.rows.map((row) => ({
      site_id: row.SITE_ID,
      site_name: row.SITE_NAME,
      location: row.LOCATION,
      description: row.DESCRIPTION,
      opening_time: row.OPENING_TIME,
      closing_time: row.CLOSING_TIME,
      ticket_price: row.TICKET_PRICE
    }));

    return res.status(200).json({
      success: true,
      message: 'Heritage sites retrieved successfully.',
      data: sites
    });
  } catch (err) {
    console.error('Get all sites error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve heritage sites.'
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
 * GET /api/heritage/:id
 * Returns full details for a single heritage site.
 */
async function getSiteById(req, res) {
  const siteId = parseInt(req.params.id, 10);

  if (Number.isNaN(siteId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid site id.'
    });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT SITE_ID, SITE_NAME, LOCATION, DESCRIPTION, OPENING_TIME, CLOSING_TIME, TICKET_PRICE
       FROM HERITAGE_SITES WHERE SITE_ID = :site_id`,
      { site_id: siteId }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Heritage site not found.'
      });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Heritage site retrieved successfully.',
      data: {
        site_id: row.SITE_ID,
        site_name: row.SITE_NAME,
        location: row.LOCATION,
        description: row.DESCRIPTION,
        opening_time: row.OPENING_TIME,
        closing_time: row.CLOSING_TIME,
        ticket_price: row.TICKET_PRICE
      }
    });
  } catch (err) {
    console.error('Get site by id error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve heritage site.'
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
 * POST /api/admin/heritage
 * Admin: creates a new heritage site.
 */
async function createSite(req, res) {
  const { site_name, location, description, opening_time, closing_time, ticket_price } = req.body;

  if (!site_name || !location) {
    return res.status(400).json({ success: false, message: 'site_name and location are required.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `INSERT INTO HERITAGE_SITES (SITE_NAME, LOCATION, DESCRIPTION, OPENING_TIME, CLOSING_TIME, TICKET_PRICE)
       VALUES (:site_name, :location, :description, :opening_time, :closing_time, :ticket_price)
       RETURNING SITE_ID INTO :site_id`,
      {
        site_name,
        location,
        description: description || null,
        opening_time: opening_time || null,
        closing_time: closing_time || null,
        ticket_price: ticket_price || 0,
        site_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const siteId = result.outBinds.site_id[0];
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Heritage site created successfully.',
      data: { site_id: siteId, site_name, location, description, opening_time, closing_time, ticket_price: ticket_price || 0 }
    });
  } catch (err) {
    console.error('Create site error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create heritage site.' });
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
 * PUT /api/admin/heritage/:id
 * Admin: updates an existing heritage site.
 */
async function updateSite(req, res) {
  const siteId = parseInt(req.params.id, 10);
  const { site_name, location, description, opening_time, closing_time, ticket_price } = req.body;

  if (Number.isNaN(siteId)) {
    return res.status(400).json({ success: false, message: 'Invalid site id.' });
  }

  if (!site_name || !location) {
    return res.status(400).json({ success: false, message: 'site_name and location are required.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `UPDATE HERITAGE_SITES
       SET SITE_NAME = :site_name, LOCATION = :location, DESCRIPTION = :description,
           OPENING_TIME = :opening_time, CLOSING_TIME = :closing_time, TICKET_PRICE = :ticket_price
       WHERE SITE_ID = :site_id`,
      {
        site_name,
        location,
        description: description || null,
        opening_time: opening_time || null,
        closing_time: closing_time || null,
        ticket_price: ticket_price || 0,
        site_id: siteId
      }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Heritage site not found.' });
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Heritage site updated successfully.',
      data: { site_id: siteId, site_name, location, description, opening_time, closing_time, ticket_price: ticket_price || 0 }
    });
  } catch (err) {
    console.error('Update site error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update heritage site.' });
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
 * DELETE /api/admin/heritage/:id
 * Admin: deletes a heritage site.
 */
async function deleteSite(req, res) {
  const siteId = parseInt(req.params.id, 10);

  if (Number.isNaN(siteId)) {
    return res.status(400).json({ success: false, message: 'Invalid site id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `DELETE FROM HERITAGE_SITES WHERE SITE_ID = :site_id`,
      { site_id: siteId }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Heritage site not found.' });
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Heritage site deleted successfully.'
    });
  } catch (err) {
    console.error('Delete site error:', err);
    if (err.errorNum === 2292) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete this heritage site because it has related bookings, events or feedback.'
      });
    }
    return res.status(500).json({ success: false, message: 'Failed to delete heritage site.' });
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
  getAllSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite
};
