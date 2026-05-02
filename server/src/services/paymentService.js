export const buildInstallmentPlan = (totalAmount) => {
  const firstPaymentAmount = Number((totalAmount / 3).toFixed(2));
  const remaining = Number((totalAmount - firstPaymentAmount).toFixed(2));
  const eachRemaining = Number((remaining / 2).toFixed(2));

  const now = new Date();
  const month1 = new Date(now);
  month1.setMonth(month1.getMonth() + 1);

  const month2 = new Date(now);
  month2.setMonth(month2.getMonth() + 2);

  return {
    firstPaymentAmount,
    installments: [
      {
        installmentNumber: 1,
        amount: firstPaymentAmount,
        dueDate: now,
        status: 'paid',
        paidAt: now,
      },
      {
        installmentNumber: 2,
        amount: eachRemaining,
        dueDate: month1,
        status: 'pending',
      },
      {
        installmentNumber: 3,
        amount: Number((remaining - eachRemaining).toFixed(2)),
        dueDate: month2,
        status: 'pending',
      },
    ],
  };
};
