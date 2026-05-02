import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    lowStockAlertActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastLowStockAlertAt: {
      type: Date,
      default: null,
    },
    lastRestockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

inventorySchema.virtual('isLowStock').get(function isLowStock() {
  return this.stock <= this.lowStockThreshold;
});

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;
