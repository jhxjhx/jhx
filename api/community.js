// Retired unauthenticated GitHub proxy. Deploy to the actual Vercel API project too.
module.exports = async (_req, res) => {
  return res.status(410).json({ error: '旧社区接口已停用，请使用新版社区。' });
};
