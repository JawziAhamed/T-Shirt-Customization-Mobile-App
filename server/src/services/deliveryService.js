// Delivery fees (LKR) by Sri Lanka district.
// Colombo is the hub — fee increases with distance.
const SL_DISTRICT_FEES = {
  // Western Province
  colombo: 250,
  gampaha: 300,
  kalutara: 350,

  // Sabaragamuwa Province
  ratnapura: 350,
  kegalle: 375,

  // North Western Province
  kurunegala: 400,
  puttalam: 450,

  // Central Province
  kandy: 450,
  matale: 500,
  'nuwara eliya': 525,

  // Southern Province
  galle: 475,
  matara: 525,
  hambantota: 575,

  // North Central Province
  anuradhapura: 575,
  polonnaruwa: 575,

  // Eastern Province
  trincomalee: 600,
  ampara: 625,
  batticaloa: 650,

  // Uva Province
  badulla: 575,
  moneragala: 625,

  // Northern Province
  vavuniya: 650,
  mannar: 675,
  kilinochchi: 700,
  jaffna: 700,
  mullaitivu: 725,
};

const DEFAULT_SL_FEE = 500; // fallback if district not found

export const calculateDeliveryFee = (address = {}, subtotal = 0) => {
  // Free delivery for large orders
  if (subtotal >= 5000) {
    return 0;
  }

  const district = String(address.state || '').trim().toLowerCase();
  return SL_DISTRICT_FEES[district] ?? DEFAULT_SL_FEE;
};
