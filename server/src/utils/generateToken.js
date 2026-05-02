import jwt from 'jsonwebtoken';

const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
};

export default generateToken;
