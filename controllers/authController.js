const bcrypt = require('bcryptjs');
const oracledb = require('oracledb');
const { getConnection } = require('../config/database');

/**
 * POST /api/auth/register
 * Registers a new TOURIST user. Guides and admins are provisioned directly
 * in the database (see database/seed.sql) and are not self-registered.
 */
async function register(req, res) {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({
      success: false,
      message: 'name, email, phone and password are all required.'
    });
  }

  let connection;
  try {
    connection = await getConnection();

    const existing = await connection.execute(
      `SELECT USER_ID FROM USERS WHERE EMAIL = :email`,
      { email }
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await connection.execute(
      `INSERT INTO USERS (NAME, EMAIL, PASSWORD, PHONE, ROLE)
       VALUES (:name, :email, :password, :phone, 'TOURIST')
       RETURNING USER_ID INTO :user_id`,
      {
        name,
        email,
        password: hashedPassword,
        phone,
        user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const userId = userResult.outBinds.user_id[0];

    const touristResult = await connection.execute(
      `INSERT INTO TOURISTS (USER_ID, ADDRESS, AGE, GENDER)
       VALUES (:user_id, NULL, NULL, NULL)
       RETURNING TOURIST_ID INTO :tourist_id`,
      {
        user_id: userId,
        tourist_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const touristId = touristResult.outBinds.tourist_id[0];

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: {
        user_id: userId,
        name,
        email,
        phone,
        role: 'TOURIST',
        tourist_id: touristId
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to a server error.'
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
 * POST /api/auth/login
 * Logs in a user of any role (TOURIST, TOUR_GUIDE, ADMIN).
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'email and password are required.'
    });
  }

  let connection;
  try {
    connection = await getConnection();

    const userResult = await connection.execute(
      `SELECT USER_ID, NAME, EMAIL, PASSWORD, PHONE, ROLE FROM USERS WHERE EMAIL = :email`,
      { email }
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const dbUser = userResult.rows[0];
    const passwordMatches = await bcrypt.compare(password, dbUser.PASSWORD);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = {
      user_id: dbUser.USER_ID,
      name: dbUser.NAME,
      email: dbUser.EMAIL,
      phone: dbUser.PHONE,
      role: dbUser.ROLE
    };

    if (dbUser.ROLE === 'TOURIST') {
      const touristResult = await connection.execute(
        `SELECT TOURIST_ID FROM TOURISTS WHERE USER_ID = :user_id`,
        { user_id: dbUser.USER_ID }
      );
      if (touristResult.rows.length > 0) {
        user.tourist_id = touristResult.rows[0].TOURIST_ID;
      }
    } else if (dbUser.ROLE === 'TOUR_GUIDE') {
      const guideResult = await connection.execute(
        `SELECT GUIDE_ID FROM TOUR_GUIDES WHERE USER_ID = :user_id`,
        { user_id: dbUser.USER_ID }
      );
      if (guideResult.rows.length > 0) {
        user.guide_id = guideResult.rows[0].GUIDE_ID;
      }
    } else if (dbUser.ROLE === 'ADMIN') {
      const adminResult = await connection.execute(
        `SELECT ADMIN_ID FROM ADMINS WHERE USER_ID = :user_id`,
        { user_id: dbUser.USER_ID }
      );
      if (adminResult.rows.length > 0) {
        user.admin_id = adminResult.rows[0].ADMIN_ID;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Login failed due to a server error.'
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

module.exports = {
  register,
  login
};
