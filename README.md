# FIAT ERC20 Checkout
A FIAT ERC20 Checkout where users can purchase ERC-20 tokens using credit cards via the Stripe CLI. The platform integrates ThirdWeb's embedded wallets and Engine.

## Getting Started

### Create ERC20 Token

Create and deploy an ERC20 token using the Thirdweb dashboard.

### Thirdweb Engine

```
docker run \                                                     
  -e ENCRYPTION_PASSWORD="..." \
  -e THIRDWEB_API_SECRET_KEY="..." \
  -e ADMIN_WALLET_ADDRESS="0x..." \
  -e POSTGRES_CONNECTION_URL="postgresql://postgres:postgres@host.docker.internal:5432/postgres?sslmode=disable" \
  -e ENABLE_HTTPS=true \
  -p 3005:3005 \
  --pull=always \
  --cpus="0.5" \
  thirdweb/engine:latest
```

Connect to the engine using the Thirdweb Dashboard and create a backend wallet. Give this backend wallet minting rights to your ERC20 token and send some native token for gas.


### Stripe CLI

Download Stripe CLI and run it.

```
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

### Create .env

Create a .env file and fill it with the parameters.

### Run 

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.