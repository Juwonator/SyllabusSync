module.exports = function(required) {
  return async function (req, res, next) {
    try {
      const userId = req.user.id;
      // Fetch permissions for the user's role
      const result = await require('../db').query(
        `SELECT array_agg(p.name) AS permissions
         FROM users u
         LEFT JOIN role_permissions rp ON rp.role_id = (SELECT id FROM roles WHERE name = u.role)
         LEFT JOIN permissions p ON p.id = rp.permission_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const permissions = result.rows[0].permissions || [];

      // `required` can be a string (single permission) or an array of permissions
      const requiredPerms = Array.isArray(required) ? required : [required];

      const missing = requiredPerms.filter(p => !permissions.includes(p));
      if (missing.length > 0) {
        return res.status(403).json({ message: 'Insufficient permission', missing });
      }

      next();
    } catch (err) {
      console.error('Permission middleware error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  };
};
