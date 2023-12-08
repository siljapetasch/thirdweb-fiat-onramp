"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Appearance, StripeElementsOptions, loadStripe } from "@stripe/stripe-js";
import { ConnectWallet, embeddedWallet, MetaMaskWallet, ThirdwebProvider, useAddress, useBalance, useBalanceForAddress, useContract, useTokenSupply } from "@thirdweb-dev/react";
import { useState } from "react";

export default function Home() {
  return (
    <ThirdwebProvider
      activeChain="avalanche-fuji"
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
      supportedWallets={[embeddedWallet()]}
    >
      <ClaimPage />
    </ThirdwebProvider>
  );
}

function ClaimPage() {
  const address = useAddress();
  const [clientSecret, setClientSecret] = useState<string>("")

  const { contract } = useContract(process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS, "token");
  const { data: tokenSupplyData } = useTokenSupply(contract);
  const { data: balanceOfData } = useBalance(contract?.getAddress());

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw 'Did you forget to add a ".env.local" file?';
  }

  const stripe = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  const appearance: Appearance = {
    theme: "flat"
  }
  const options: StripeElementsOptions = {
    clientSecret,
    appearance
  }

  const onClick = async () => {
    const resp = await fetch("/api/stripe-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerWalletAddress: address,
      }),
    });
    if (resp.ok) {
      const json = await resp.json();
      setClientSecret(json.clientSecret);
    }
  };

  return (
    <main className="flex flex-col gap-y-8 items-center p-12 h-screen">
      <h1 className="text-6xl font-bold">Fiat Onramp</h1>
      <h1 className="text-xl">Buy FAN with Credit Card</h1>
      <ConnectWallet theme={"light"} />
      <div>
        <p>Your Balance: {balanceOfData?.displayValue.toString()} {balanceOfData?.symbol}</p>
        <p>Total Supply: {tokenSupplyData?.displayValue.toString()} {tokenSupplyData?.symbol}</p>
      </div>
      {!clientSecret ? (
        <button
          className="bg-[#112D4E] hover:bg-[#3F72AF] text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 disabled:opacity-50"
          onClick={onClick}
          disabled={!address}
        >
          Buy Tokens
        </button>
      ) : (
        <Elements
          options={{
            clientSecret,
            appearance: { theme: "night" },
          }}
          stripe={stripe}
        >
          <CreditCardForm />
        </Elements>
      )}
    </main>
  )
}

const CreditCardForm = () => {
  const elements = useElements();
  const stripe = useStripe();
  const { contract } = useContract(process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS, "token");
  const address = useAddress();

  type formStatus = "inital" | "paymentRequested" | "paymentConfirmed" | "tokensMinted";

  const [status, setStatus] = useState<formStatus>("inital");
  const [txHash, setTxHash] = useState("");

  const onClick = async () => {
    if (!stripe || !elements) {
      return;
    }

    setStatus("paymentRequested")

    try {
      const { paymentIntent, error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: "http://localhost:3000/",
        },
        redirect: "if_required",
      });
      if (error) {
        throw error.message;
      }
      if (paymentIntent.status === "succeeded") {
        setStatus("paymentConfirmed")

        console.log("Waiting for minting")

        const unsubscribe = contract?.events.addEventListener(
          "TokensMinted",
          (event) => {
            console.log("minted", event);
            if (event.data.mintedTo == address) {
              setStatus("tokensMinted");
              setTxHash(event.transaction.transactionHash);
            }

          },
        );

        setTimeout(() => { unsubscribe && unsubscribe() }, 30000);

      } else {
        alert("Payment failed. Please try again.");
      }
    } catch (e) {
      alert(`There was an error with the payment. ${e}`);
      setStatus("inital")
    }

  };

  return (
    <>
      {(status == "inital" || status == "paymentRequested") &&
        <>
          <PaymentElement />

          <button
            className="bg-[#112D4E] hover:bg-[#3F72AF] text-white font-bold py-2 px-4 rounded-lg"
            onClick={onClick}
            disabled={status !== "inital"}
          >
            {status == "inital" && "Pay now"}
            {status == "paymentRequested" && "Processing your request"}
          </button>
        </>}

      {status == "paymentConfirmed" &&
        <p className="font-semibold text-lg">Thank you for your payment. You will receive your Tokens shortly.</p>
      }

      {status == "tokensMinted" &&
        <p className="font-semibold text-lg">You have received your Tokens.<br /> View your transaction here:<a href={`https://testnet.snowtrace.io/tx/${txHash}?chainId=43113`}>Snowtrace</a></p>
      }
    </>
  );
};