import web3 = require("@solana/web3.js");
import fs from "fs";
import Dotenv from "dotenv";
Dotenv.config();

// initialize keypair
async function initializeKeypair(connection: web3.Connection) {
    const privateKey = !process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.log("creating .env fiel ...");
        const signer = web3.Keypair.generate();
        fs.writeFileSync(
            ".env",
            `PRIVATE_KEY=[${signer.secretKey.toString()}]`,
        );

        // airdrop some sol
        let balance = await connection.getBalance(signer.publicKey);
        console.log("current balance ", balance / web3.LAMPORTS_PER_SOL);

        if (balance / web3.LAMPORTS_PER_SOL < 1) {
            console.log("airdropping 1 sol ...");
            const airdropSign = await connection.requestAirdrop(
                signer.publicKey,
                web3.LAMPORTS_PER_SOL,
            );

            const latestBlockHash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature: airdropSign,
            });

            balance = await connection.getBalance(signer.publicKey);
            console.log("new balance ", balance / web3.LAMPORTS_PER_SOL);
        }
    }
}
// airdrop sol
// create transfer function

async function main() {}

main()
    .then(() => {
        console.log("Finished successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
