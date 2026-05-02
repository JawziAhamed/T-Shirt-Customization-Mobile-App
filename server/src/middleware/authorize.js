import ApiError from '../utils/ApiError.js';

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }

  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, 'Forbidden: insufficient permissions');
  }

  next();
};

export default authorize;
