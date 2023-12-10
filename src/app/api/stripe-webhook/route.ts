import { Engine } from "@thirdweb-dev/engine";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2023-10-16",
});

const {
    ENGINE_URL,
    ENGINE_ACCESS_TOKEN,
    NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS,
    BACKEND_WALLET_ADDRESS,
} = process.env;

export async function POST(req: NextRequest) {
    console.log("Processing transfer tokens");

    if (!process.env.WEBHOOK_SECRET_KEY) {
        throw 'Server misconfigured. Did you forget to add a ".env.local" file?';
    }

    // Validate the Stripe webhook signature.
    const body = await req.text();
    const signature = headers().get("stripe-signature");
    if (!signature) {
        throw "Stripe webhook signature not provided. This request may not be valid.";
    }

    const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.WEBHOOK_SECRET_KEY
    );
    switch (event.type) {
        case "charge.succeeded":
            // Handle the webhook
            await handleChargeSucceeded(event.data.object);
            break;
        default:
        // Ignore. Unexpected Stripe event.
    }

    return NextResponse.json({ message: "OK" });
}

const handleChargeSucceeded = async (charge: Stripe.Charge) => {
    if (
        !ENGINE_URL ||
        !ENGINE_ACCESS_TOKEN ||
        !NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS ||
        !BACKEND_WALLET_ADDRESS
    ) {
        console.log("Param missing");
        throw 'Server misconfigured. Did you forget to add a ".env.local" file?';
    }

    const { buyerWalletAddress } = charge.metadata;
    if (!buyerWalletAddress) {
        console.log("Buyer Wallet address missing");
        throw 'Webhook metadata is missing "buyerWalletAddress".';

    }

    // Mint a 100 tokens to the buyer with Engine.
    const engine = new Engine({
        url: ENGINE_URL,
        accessToken: ENGINE_ACCESS_TOKEN,
    });

    console.log("Call engine to mint Token");

    await engine.erc20.mintTo(
        "avalanche-fuji",
        NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS,
        BACKEND_WALLET_ADDRESS,
        {
            toAddress: buyerWalletAddress,
            amount: "100"
        }
    );


};