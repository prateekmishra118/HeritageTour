-- ==================================================
-- Smart Tourism & Heritage Management Platform
-- Seed Data
-- Run this AFTER schema.sql, connected as TOURISM_APP
-- ==================================================

-- ==================================================
-- HERITAGE SITES
-- ==================================================
INSERT INTO HERITAGE_SITES (SITE_NAME, LOCATION, DESCRIPTION, OPENING_TIME, CLOSING_TIME, TICKET_PRICE)
VALUES ('Taj Mahal', 'Agra, Uttar Pradesh', 'An ivory-white marble mausoleum and UNESCO World Heritage Site, one of the New Seven Wonders of the World.', '06:00', '19:00', 50);

INSERT INTO HERITAGE_SITES (SITE_NAME, LOCATION, DESCRIPTION, OPENING_TIME, CLOSING_TIME, TICKET_PRICE)
VALUES ('Qutub Minar', 'Delhi', 'A soaring 73-metre minaret built in the 12th century, the tallest brick minaret in the world.', '07:00', '17:00', 40);

INSERT INTO HERITAGE_SITES (SITE_NAME, LOCATION, DESCRIPTION, OPENING_TIME, CLOSING_TIME, TICKET_PRICE)
VALUES ('Gateway of India', 'Mumbai, Maharashtra', 'An iconic arch monument built in the 20th century overlooking the Arabian Sea.', '00:00', '23:59', 0);

INSERT INTO HERITAGE_SITES (SITE_NAME, LOCATION, DESCRIPTION, OPENING_TIME, CLOSING_TIME, TICKET_PRICE)
VALUES ('Sanchi Stupa', 'Sanchi, Madhya Pradesh', 'One of the oldest stone structures in India and an important Buddhist monument.', '08:00', '18:00', 40);

INSERT INTO HERITAGE_SITES (SITE_NAME, LOCATION, DESCRIPTION, OPENING_TIME, CLOSING_TIME, TICKET_PRICE)
VALUES ('Red Fort', 'Delhi', 'A historic Mughal fortress that served as the main residence of the Mughal emperors.', '09:30', '16:30', 35);

-- ==================================================
-- ADMIN USER
-- Login: admin@heritagetour.com / Admin@123
-- ==================================================
INSERT INTO USERS (NAME, EMAIL, PASSWORD, PHONE, ROLE)
VALUES ('Platform Administrator', 'admin@heritagetour.com', '$2b$10$UaCofMUGKP9SJH/tyuvD3eUpnb2uPZOv/C93gNJL54XBwefhmtSue', '9000000000', 'ADMIN');

INSERT INTO ADMINS (USER_ID, DESIGNATION)
VALUES ((SELECT USER_ID FROM USERS WHERE EMAIL = 'admin@heritagetour.com'), 'Platform Manager');

-- ==================================================
-- TOUR GUIDE USERS
-- Login for all guides below: password Guide@123
-- ==================================================
INSERT INTO USERS (NAME, EMAIL, PASSWORD, PHONE, ROLE)
VALUES ('Arjun Mehta', 'arjun.guide@heritagetour.com', '$2b$10$gaFJl.wF9BXpZ28byd1FXeHGPPAIt6zNVW4mwGAQ3yvMQo.qcZIX6', '9111111111', 'TOUR_GUIDE');

INSERT INTO USERS (NAME, EMAIL, PASSWORD, PHONE, ROLE)
VALUES ('Priya Nair', 'priya.guide@heritagetour.com', '$2b$10$gaFJl.wF9BXpZ28byd1FXeHGPPAIt6zNVW4mwGAQ3yvMQo.qcZIX6', '9222222222', 'TOUR_GUIDE');

INSERT INTO USERS (NAME, EMAIL, PASSWORD, PHONE, ROLE)
VALUES ('Rahul Verma', 'rahul.guide@heritagetour.com', '$2b$10$gaFJl.wF9BXpZ28byd1FXeHGPPAIt6zNVW4mwGAQ3yvMQo.qcZIX6', '9333333333', 'TOUR_GUIDE');

INSERT INTO USERS (NAME, EMAIL, PASSWORD, PHONE, ROLE)
VALUES ('Sara Khan', 'sara.guide@heritagetour.com', '$2b$10$gaFJl.wF9BXpZ28byd1FXeHGPPAIt6zNVW4mwGAQ3yvMQo.qcZIX6', '9444444444', 'TOUR_GUIDE');

INSERT INTO TOUR_GUIDES (USER_ID, EXPERIENCE, LANGUAGE, AVAILABILITY)
VALUES ((SELECT USER_ID FROM USERS WHERE EMAIL = 'arjun.guide@heritagetour.com'), 7, 'English, Hindi', 'AVAILABLE');

INSERT INTO TOUR_GUIDES (USER_ID, EXPERIENCE, LANGUAGE, AVAILABILITY)
VALUES ((SELECT USER_ID FROM USERS WHERE EMAIL = 'priya.guide@heritagetour.com'), 5, 'English, Hindi, French', 'AVAILABLE');

INSERT INTO TOUR_GUIDES (USER_ID, EXPERIENCE, LANGUAGE, AVAILABILITY)
VALUES ((SELECT USER_ID FROM USERS WHERE EMAIL = 'rahul.guide@heritagetour.com'), 3, 'English, Marathi', 'AVAILABLE');

INSERT INTO TOUR_GUIDES (USER_ID, EXPERIENCE, LANGUAGE, AVAILABILITY)
VALUES ((SELECT USER_ID FROM USERS WHERE EMAIL = 'sara.guide@heritagetour.com'), 9, 'English, Hindi, Urdu, Arabic', 'UNAVAILABLE');

-- ==================================================
-- SAMPLE TOURIST
-- Login: tourist@example.com / Tourist@123
-- ==================================================
INSERT INTO USERS (NAME, EMAIL, PASSWORD, PHONE, ROLE)
VALUES ('Demo Tourist', 'tourist@example.com', '$2b$10$yhcKSs3LhjrQ3I3hscOADe3joSBZBvjcLS0rgOXJtchN1ra8G9.xa', '9555555555', 'TOURIST');

INSERT INTO TOURISTS (USER_ID, ADDRESS, AGE, GENDER)
VALUES ((SELECT USER_ID FROM USERS WHERE EMAIL = 'tourist@example.com'), '12 MG Road, Bengaluru, Karnataka', 29, 'OTHER');

-- ==================================================
-- SAMPLE EVENTS
-- ==================================================
INSERT INTO EVENTS (SITE_ID, EVENT_NAME, EVENT_DATE, EVENT_TIME, DESCRIPTION)
VALUES (
  (SELECT SITE_ID FROM HERITAGE_SITES WHERE SITE_NAME = 'Taj Mahal'),
  'Moonlight Heritage Walk',
  DATE '2026-11-15',
  '19:30',
  'A guided evening walk around the Taj Mahal complex with storytelling on Mughal history.'
);

INSERT INTO EVENTS (SITE_ID, EVENT_NAME, EVENT_DATE, EVENT_TIME, DESCRIPTION)
VALUES (
  (SELECT SITE_ID FROM HERITAGE_SITES WHERE SITE_NAME = 'Red Fort'),
  'Sound and Light Show',
  DATE '2026-10-05',
  '18:30',
  'An evening sound and light show narrating the history of the Red Fort and the Mughal empire.'
);

INSERT INTO EVENTS (SITE_ID, EVENT_NAME, EVENT_DATE, EVENT_TIME, DESCRIPTION)
VALUES (
  (SELECT SITE_ID FROM HERITAGE_SITES WHERE SITE_NAME = 'Sanchi Stupa'),
  'Buddhist Heritage Festival',
  DATE '2026-12-01',
  '10:00',
  'A cultural festival celebrating the Buddhist heritage and architecture of Sanchi.'
);

INSERT INTO EVENTS (SITE_ID, EVENT_NAME, EVENT_DATE, EVENT_TIME, DESCRIPTION)
VALUES (
  (SELECT SITE_ID FROM HERITAGE_SITES WHERE SITE_NAME = 'Gateway of India'),
  'Harbour Heritage Cruise',
  DATE '2026-10-20',
  '16:00',
  'A guided boat cruise around Mumbai harbour starting at the Gateway of India.'
);

COMMIT;
