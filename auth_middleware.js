// authMiddleware.js

// Middleware function to check if the user is authenticated and has the required role
const authenticateAndAuthorize = (requiredRole) => {
    return (req, res, next) => {
      if (req.session.userRole && req.session.userRole === requiredRole) {
        // User is authenticated and has the required role
        next(); // Proceed to the next middleware or route handler
      } else {
        // User is not authenticated or does not have the required role
        res.status(403).send('Unauthorized');
      }
    };
  };
  
  module.exports = { authenticateAndAuthorize };
  