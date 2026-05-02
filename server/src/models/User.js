import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    phone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    activityLogs: {
      type: [
        new mongoose.Schema(
          {
            action: {
              type: String,
              required: true,
              trim: true,
              maxlength: 120,
            },
            ipAddress: {
              type: String,
              default: '',
            },
            userAgent: {
              type: String,
              default: '',
            },
            meta: {
              type: mongoose.Schema.Types.Mixed,
              default: null,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.virtual('isLocked').get(function isLocked() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.pre('insertMany', async function hashPasswordsForInsertMany(next, docs) {
  for (const doc of docs) {
    if (!doc.password) {
      continue;
    }

    if (String(doc.password).startsWith('$2a$') || String(doc.password).startsWith('$2b$')) {
      continue;
    }

    const salt = await bcrypt.genSalt(10);
    doc.password = await bcrypt.hash(doc.password, salt);
  }

  next();
});

userSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.pushActivity = function pushActivity({
  action,
  ipAddress = '',
  userAgent = '',
  meta = null,
}) {
  if (!action) return;

  const activityItem = {
    action,
    ipAddress: String(ipAddress || ''),
    userAgent: String(userAgent || ''),
    meta,
    createdAt: new Date(),
  };

  this.activityLogs = [activityItem, ...(this.activityLogs || [])].slice(0, 25);
};

userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
