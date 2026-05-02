import mongoose from 'mongoose';

const giftCardTransactionSchema = new mongoose.Schema(
  {
    gift_card_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GiftCard',
      required: true,
      index: true,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    used_amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

giftCardTransactionSchema.index({ gift_card_id: 1, created_at: -1 });

const GiftCardTransaction = mongoose.model('GiftCardTransaction', giftCardTransactionSchema);

export default GiftCardTransaction;
