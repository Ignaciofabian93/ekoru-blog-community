export default () => ({
  port: parseInt(process.env.PORT || '9004', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
});
