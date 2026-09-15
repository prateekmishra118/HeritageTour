const oracledb = require('oracledb');
const { getConnection } = require('../config/database');

/**
 * POST /api/feedback
 * Body: { tourist_id, site_id, rating, comments }
 */
async function submitFeedback(req, res) {
  const { tourist_id, site_id, rating, comments } = req.body;

  if (!tourist_id || !site_id || !rating) {
    return res.status(400).json({
      success: false,
      message: 'tourist_id, site_id and rating are required.'
    });
  }

  const numericRating = Number(rating);
  if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({
      success: false,
      message: 'rating must be a number between 1 and 5.'
    });
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

    if (req.user && req.user.role === 'TOURIST') {
      const ownerCheck = await connection.execute(
        `SELECT TOURIST_ID FROM TOURISTS WHERE TOURIST_ID = :tourist_id AND USER_ID = :user_id`,
        { tourist_id, user_id: req.user.user_id }
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'You can only submit feedback as yourself.' });
      }
    }

    const insertResult = await connection.execute(
      `INSERT INTO FEEDBACK (TOURIST_ID, SITE_ID, RATING, COMMENTS, FEEDBACK_DATE)
       VALUES (:tourist_id, :site_id, :rating, :comments, SYSDATE)
       RETURNING FEEDBACK_ID INTO :feedback_id`,
      {
        tourist_id,
        site_id,
        rating: numericRating,
        comments: comments || null,
        feedback_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const feedbackId = insertResult.outBinds.feedback_id[0];
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully.',
      data: { feedback_id: feedbackId, tourist_id, site_id, rating: numericRating, comments }
    });
  } catch (err) {
    console.error('Submit feedback error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit feedback.' });
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
 * GET /api/feedback/site/:siteId
 * Returns all feedback submitted for a heritage site, joined with the
 * tourist's name.
 */
async function getFeedbackBySite(req, res) {
  const siteId = parseInt(req.params.siteId, 10);

  if (Number.isNaN(siteId)) {
    return res.status(400).json({ success: false, message: 'Invalid site id.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT f.FEEDBACK_ID, f.TOURIST_ID, f.SITE_ID, f.RATING, f.COMMENTS, f.FEEDBACK_DATE,
              u.NAME AS TOURIST_NAME
       FROM FEEDBACK f
       JOIN TOURISTS t ON f.TOURIST_ID = t.TOURIST_ID
       JOIN USERS u ON t.USER_ID = u.USER_ID
       WHERE f.SITE_ID = :site_id
       ORDER BY f.FEEDBACK_DATE DESC`,
      { site_id: siteId }
    );

    const feedback = result.rows.map((row) => ({
      feedback_id: row.FEEDBACK_ID,
      tourist_id: row.TOURIST_ID,
      tourist_name: row.TOURIST_NAME,
      site_id: row.SITE_ID,
      rating: row.RATING,
      comments: row.COMMENTS,
      feedback_date: row.FEEDBACK_DATE
    }));

    return res.status(200).json({
      success: true,
      message: 'Feedback retrieved successfully.',
      data: feedback
    });
  } catch (err) {
    console.error('Get feedback by site error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve feedback.' });
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
  submitFeedback,
  getFeedbackBySite
};
