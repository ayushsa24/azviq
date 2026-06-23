const Razorpay = require("razorpay");
const rzp = new Razorpay({
  key_id: "rzp_test_Sa77EbR2kzzBaq",
  key_secret: "GhfUD8s0eh0yNr4ADEpKHplU",
});
rzp.orders.create({ amount: 100, currency: "INR", receipt: "test" })
  .then(console.log)
  .catch(console.error);
