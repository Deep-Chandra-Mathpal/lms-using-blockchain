async function logoutUser(req) {
    // Destroy the session and clear the session data
    req.session.destroy((err) => {
      if (err) {
        console.log('Error logging out:', err);
      } else {
        console.log('Logout successful');
      }
    });
  }

module.exports = { logoutUser };