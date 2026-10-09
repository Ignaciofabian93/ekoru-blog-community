export default () => ({
  port: parseInt(process.env.PORT || '4005', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  // ekoru-users owns notification delivery and email (BLC-3).
  subgraphs: {
    users: process.env.USERS_URL,
  },
  internalSecret: process.env.INTERNAL_SERVICE_SECRET,
  // Public web app, for links in attendee emails.
  webAppUrl: process.env.WEB_APP_URL || 'https://app.ekoru.cl',
});
