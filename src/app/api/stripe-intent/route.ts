import { NextResponse } from "next/server";
import Stripe from "stripe";

const { STRIPE_SECRET_KEY } = process.env;

export async function POST(req: Request) {
  console.log("Payment Intent");
  if (!STRIPE_SECRET_KEY) {
    console.log("No Stripe Secret Key");
    throw 'Server misconfigured. Did you forget to add a ".env.local" file?';
  }

  const { buyerWalletAddress } = await req.json();
  if (!buyerWalletAddress) {
    console.log("Buyer Address missing");
    throw 'Request is missing "buyerWalletAddress".';
  }

  console.log("Set up stripe");

  // Create a Stripe payment intent for $100 USD.
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 100_00,
    currency: "usd",
    description: "Token delivered by thirdweb Engine",
    payment_method_types: ["card"],
    metadata: { buyerWalletAddress },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
  });
}