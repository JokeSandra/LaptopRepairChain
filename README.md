# LaptopRepairChain

## Overview

LaptopRepairChain is a decentralized Web3 application built on the Stacks blockchain using Clarity smart contracts. It provides blockchain-verified repair logs for laptops, enabling transparent, tamper-proof tracking of repair histories. Users can submit repair requests virtually through a portal, and in-person pickups are managed via smart contracts that ensure secure handovers, payments, and verifications. This project addresses real-world issues in the electronics repair industry, such as lack of transparency, fraud in repair claims, disputes over service quality, and insecure device handovers.

By leveraging blockchain, all repair logs are immutable and verifiable, reducing trust issues between customers and repair shops. Virtual submissions streamline the process, while smart contract-based pickups automate escrow, identity verification, and release conditions, minimizing human error and fraud.

## Real-World Problems Solved

- **Lack of Transparency in Repairs**: Traditional repair logs can be altered or falsified. Blockchain ensures immutable records, allowing customers to verify repair history before resale or warranty claims.
- **Fraud and Disputes**: Shops might overcharge or claim unnecessary repairs. Smart contracts enforce predefined repair scopes and log each step, with disputes resolved on-chain.
- **Insecure Handovers**: In-person pickups risk theft or mismatches. Smart contracts use multi-signature or QR-based verification for secure releases.
- **Inefficient Submissions**: Physical drop-offs are inconvenient. Virtual portals allow remote submissions with device details and issues.
- **Payment Security**: Escrow smart contracts hold payments until repairs are verified and picked up, preventing scams.
- **Resale Trust**: Buyers can query blockchain for a laptop's repair history, increasing market confidence and reducing e-waste by extending device lifespans.

## Architecture

The project consists of 6 core smart contracts written in Clarity, deployed on the Stacks blockchain. These contracts interact to form a complete repair lifecycle. Stacks settles on Bitcoin for added security, and Clarity's decidable nature ensures no runtime errors or infinite loops.

### Smart Contracts

1. **UserRegistry.clar**
   - **Purpose**: Manages user registration for customers and repair shops. Stores user profiles, including STX addresses, roles (customer/shop), and verification status (e.g., KYC via off-chain oracles).
   - **Key Functions**:
     - `register-user (role: string, details: (tuple ...))`: Registers a user with a role.
     - `verify-user (user: principal)`: Marks a user as verified (e.g., after off-chain ID check).
     - `get-user-role (user: principal)`: Retrieves user role for access control.
   - **Data Structures**: Maps principals to user tuples (role, verified, metadata).
   - **Interactions**: Used by all other contracts for authentication.

2. **DeviceRegistry.clar**
   - **Purpose**: Registers laptops/devices with unique identifiers (e.g., serial numbers hashed to NFTs). Tracks ownership and basic metadata.
   - **Key Functions**:
     - `register-device (serial: string, owner: principal)`: Mints a semi-fungible token (SFT) representing the device.
     - `transfer-device (device-id: uint, new-owner: principal)`: Transfers ownership (e.g., on resale).
     - `get-device-history (device-id: uint)`: Returns linked repair logs (cross-contract call to RepairLog).
   - **Data Structures**: Maps device IDs (uint) to tuples (serial-hash, owner, metadata). Uses Clarity's SIP-010 for token standards.
   - **Interactions**: Links devices to repair requests; ensures only owners can submit repairs.

3. **RepairRequest.clar**
   - **Purpose**: Handles virtual submission of repair requests. Customers describe issues, upload proofs (e.g., photos via IPFS hashes), and shops bid or accept.
   - **Key Functions**:
     - `submit-request (device-id: uint, description: string, ipfs-hash: string)`: Creates a request; emits event for shops.
     - `accept-request (request-id: uint, shop: principal, quote: uint)`: Shop accepts with a price quote.
     - `confirm-acceptance (request-id: uint)`: Customer confirms, triggering escrow.
   - **Data Structures**: Maps request IDs to tuples (device-id, status: pending/accepted/in-progress/completed, description, bids).
   - **Interactions**: Calls PaymentEscrow for fund locking; notifies RepairLog on acceptance.

4. **RepairLog.clar**
   - **Purpose**: Maintains immutable, blockchain-verified logs of repair steps. Each log entry is timestamped and signed by the shop.
   - **Key Functions**:
     - `add-log-entry (request-id: uint, step: string, proof-hash: string)`: Appends a log (e.g., "Diagnosed RAM issue" with photo hash).
     - `finalize-logs (request-id: uint)`: Marks logs as complete; prevents further additions.
     - `query-logs (device-id: uint)`: Returns all logs for a device (publicly verifiable).
   - **Data Structures**: Lists of log entries per request-id, with tuples (timestamp, step, proof-hash).
   - **Interactions**: Integrated with RepairRequest and Pickup for end-to-end traceability.

5. **PaymentEscrow.clar**
   - **Purpose**: Secures payments using escrow. Holds STX (Stacks tokens) until repair completion and pickup verification.
   - **Key Functions**:
     - `fund-escrow (request-id: uint, amount: uint)`: Customer deposits funds on confirmation.
     - `release-funds (request-id: uint)`: Releases to shop after pickup confirmation.
     - `refund (request-id: uint)`: Refunds customer on dispute resolution or cancellation.
   - **Data Structures**: Maps request-ids to escrow tuples (amount, payer, payee, status).
   - **Interactions**: Triggered by RepairRequest; conditions checked via cross-contract calls to RepairLog and Pickup.

6. **PickupContract.clar**
   - **Purpose**: Manages in-person pickups with smart contract automation. Uses QR codes or NFC for verification, ensuring device release only to authorized users.
   - **Key Functions**:
     - `initiate-pickup (request-id: uint, location: string)`: Shop signals readiness; generates a one-time verification code.
     - `verify-pickup (request-id: uint, code: string)`: Customer scans/submits code; contract checks and releases escrow.
     - `confirm-receipt (request-id: uint)`: Customer confirms device received in good condition.
   - **Data Structures**: Maps request-ids to pickup tuples (code-hash, status, location).
   - **Interactions**: Calls PaymentEscrow on successful verification; updates RepairLog with final entry.

## How It Works

1. **User Onboarding**: Customers and shops register via UserRegistry.
2. **Device Registration**: Customer registers laptop in DeviceRegistry.
3. **Virtual Submission**: Customer submits repair request via RepairRequest, including details and proofs.
4. **Shop Acceptance**: Verified shops accept and quote; customer confirms, funding escrow.
5. **Repair Process**: Shop logs steps in RepairLog; all verifiable on-chain.
6. **Pickup**: Shop initiates pickup; customer verifies in-person, triggering fund release and log finalization.
7. **Queries & Resale**: Anyone can query device history for transparency.

Frontend (not included) could be a dApp built with React and @stacks/connect for wallet integration.

## Tech Stack

- **Blockchain**: Stacks (Layer-1 on Bitcoin).
- **Smart Contracts**: Clarity language.
- **Tokens**: STX for payments; SIP-010 for device NFTs.
- **Storage**: IPFS for off-chain proofs (photos, docs).
- **Oracles**: Optional for real-world data (e.g., location via Chainlink on Stacks).

## Installation and Deployment

### Prerequisites
- Node.js >= 18
- Clarinet (Clarity dev tool): `npm install -g @hirosystems/clarinet`
- Stacks Wallet (for testing STX transactions)

### Setup
1. Clone the repo `
2. Navigate: `cd LaptopRepairChain`
3. Install dependencies: `npm install` (for any scripts/tests)
4. Start local devnet: `clarinet integrate`

### Deploy Contracts
- Use Clarinet to deploy to Stacks testnet/mainnet.
- Example: `clarinet deploy --testnet`

### Testing
- Run unit tests: `clarinet test`
- Integration tests simulate full lifecycle (submission to pickup).

## Contributing
Fork the repo, create a branch, and submit PRs. Focus on security audits for contracts.

## License
MIT License. See LICENSE file for details.