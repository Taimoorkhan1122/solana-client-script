import web3 = require("@solana/web3.js");
import fs from "fs";
import Dotenv from "dotenv";
Dotenv.config();

// initialize keypair
async function initializeKeypair(connection: web3.Connection): Promise<web3.Keypair> {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.log("creating .env file ...");
        const signer = web3.Keypair.generate();
        fs.writeFileSync(".env", `PRIVATE_KEY=[${signer.secretKey.toString()}]`);
        // airdrop some sol
        airdropSol(signer, connection);
        return signer;
    }

    const secret = JSON.parse(privateKey ?? "") as number[];
    const keypairFromSecret = web3.Keypair.fromSecretKey(Uint8Array.from(secret));
    //airdrop
    await airdropSol(keypairFromSecret, connection);
    return keypairFromSecret;
}

// airdrop sol
async function airdropSol(signer: web3.Keypair, connection: web3.Connection) {
    let balance = await connection.getBalance(signer.publicKey);
    console.log("💰 current balance: ", balance / web3.LAMPORTS_PER_SOL);

    if (balance / web3.LAMPORTS_PER_SOL < 1) {
        console.log("🛬 airdropping 1 sol ...");
        const airdropSign = await connection.requestAirdrop(signer.publicKey, web3.LAMPORTS_PER_SOL);

        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: airdropSign,
        });

        balance = await connection.getBalance(signer.publicKey);
        console.log("💰 new balance ", balance / web3.LAMPORTS_PER_SOL);
    }
}
// create transfer function
async function transferSolToAccount(
    payer: web3.Keypair,
    receiver: web3.Keypair,
    amount: number,
    conn: web3.Connection,
) {
    //some checks before transaction
    const payerBalance = await conn.getBalance(payer.publicKey);
    if (payerBalance / web3.LAMPORTS_PER_SOL < amount) {
        const msg = `not enough account balance...\nCurrent Balance: ${payerBalance}\nRequested Amount: ${amount}`;
        throw new Error(msg);
    }
    if (amount <= 0) {
        const msg = `amount should be greater than 0\nRequested Amount: ${amount}`;
        throw new Error(msg);
    }
    // create transation
    let currentBalance = await conn.getBalance(receiver.publicKey);
    console.log(
        `\n🚀 Initializing transaction...\n📤 Sending ${amount} to: ${receiver.publicKey}\n💰 Current Balance: ${currentBalance}`,
    );

    const tx = new web3.Transaction();
    tx.add(
        web3.SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: receiver.publicKey,
            lamports: amount * web3.LAMPORTS_PER_SOL,
        }),
    );

    //sign and confirm transaction
    console.log("📜 Verifying transaction...");
    const sign = await web3.sendAndConfirmTransaction(conn, tx, [payer]);
    //view transaction signature on etherscan
    currentBalance = await conn.getBalance(receiver.publicKey);
    console.log(`💰 New Balance: ${currentBalance / web3.LAMPORTS_PER_SOL}`);
    console.log(
        `\n🎉 view this transaction on the Solana Explorer at:\nhttps://explorer.solana.com/tx/${sign}?cluster=devnet`,
    );
}
async function main() {
    const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
    const payer = await initializeKeypair(connection);
    const receiver = web3.Keypair.generate();
    await transferSolToAccount(payer, receiver, 0.5, connection);
}

main()
    .then(() => {
        console.log("Finished successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
