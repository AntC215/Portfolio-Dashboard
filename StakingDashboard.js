import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers'; // Import ethers for Ethereum integration
import { Container, Grid, Card, CardContent, Typography, Button, CircularProgress, Snackbar, Box, Tooltip } from '@mui/material';
import {
    ConnectionProvider,
    WalletProvider,
    useWallet,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey, clusterApiUrl, Transaction, SystemProgram } from '@solana/web3.js'; // Solana integration

// Ethereum Lido staking contract details
const STAKING_CONTRACT_ADDRESS = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'; // Replace with Lido staking contract address
const STAKING_CONTRACT_ABI = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "_referral",
                "type": "address"
            }
        ],
        "name": "submit",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "getSharesByPooledEth",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "getPooledEthByShares",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_address",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

// Solana Jito Steward Program details
const STEWARD_PROGRAM_ID = new PublicKey('Stewardf95sJbmtcZsyagb2dg4Mo8eVQho8gpECvLx8');

// Initialize Solana connection
const SOLANA_CLUSTER_URL = clusterApiUrl('mainnet-beta');

const StakingDashboard = () => {
    const [ethStaked, setEthStaked] = useState(0);
    const [stEthBalance, setStEthBalance] = useState(0); // State for stETH balance
    const [solStaked, setSolStaked] = useState(0);
    const [jitoSolBalance, setJitoSolBalance] = useState(0); // State for JitoSOL balance
    const [loading, setLoading] = useState(true);
    const [provider, setProvider] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Solana wallet integration hook
    const { publicKey, sendTransaction } = useWallet();
    const solanaConnection = useMemo(() => new Connection(SOLANA_CLUSTER_URL), []);

    useEffect(() => {
        // Initialize Ethereum provider and fetch initial data for the dashboard
        const initProvider = async () => {
            if (window.ethereum) {
                const newProvider = new ethers.BrowserProvider(window.ethereum); // Use BrowserProvider for ethers v6
                setProvider(newProvider);
                await fetchEthStakingData(); // Fetch Ethereum staking data
            }
            setLoading(false);
        };

        initProvider();
    }, [provider]);

    // Function to fetch Ethereum staking data
    const fetchEthStakingData = async () => {
        if (!provider) return;

        const signer = await provider.getSigner();
        const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer);
        try {
            const stakedAmount = await contract.balanceOf(signer.getAddress()); // Get stETH balance
            setEthStaked(ethers.formatEther(stakedAmount));

            // Fetch stETH balance
            const stEthBalance = await contract.balanceOf(signer.getAddress()); // Adjust this to the stETH contract if needed
            setStEthBalance(ethers.formatEther(stEthBalance));
        } catch (error) {
            console.error('Error fetching staking data:', error);
        }
    };

    // Ethereum staking function
    const stakeETH = async () => {
        if (!provider) {
            alert('Please connect to a wallet!');
            return;
        }

        const signer = await provider.getSigner();
        const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer);
        try {
            const tx = await contract.submit('0x0000000000000000000000000000000000000000', { value: ethers.parseEther('0.1') }); // Example: Staking 0.1 ETH
            await tx.wait();
            setSnackbar({ open: true, message: 'Staking successful!', severity: 'success' });
            fetchEthStakingData(); // Fetch updated data
        } catch (error) {
            console.error('Error staking:', error);
            setSnackbar({ open: true, message: 'Error staking ETH. Please try again.', severity: 'error' });
        }
    };

    // Ethereum unstaking function (this is a placeholder as the Lido contract does not directly support unstaking)
    const unstakeETH = async () => {
        alert('Unstaking not directly supported by Lido contract via this interface. Swap stETH to ETH using a decentralized exchange like Curve.');
    };

    // Solana staking function with Jito Steward Program
    const stakeSOL = async () => {
        if (!publicKey) {
            alert('Please connect to a Solana wallet!');
            return;
        }

        try {
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: STEWARD_PROGRAM_ID, // Steward Program ID
                    lamports: 1e9, // Amount in lamports (1 SOL = 1e9 lamports)
                })
            );

            const { blockhash } = await solanaConnection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, solanaConnection);
            await solanaConnection.confirmTransaction(signature, 'processed');

            setSnackbar({ open: true, message: 'Staking SOL with Jito via Steward Program successful!', severity: 'success' });
            setSolStaked((prev) => prev + 1); // Update staked amount
            fetchJitoSolBalance(); // Fetch updated JitoSOL balance
        } catch (error) {
            console.error('Error staking SOL with Jito via Steward Program:', error);
            setSnackbar({ open: true, message: 'Error staking SOL with Jito via Steward Program. Please try again.', severity: 'error' });
        }
    };

    // Solana unstaking function with Jito Steward Program
    const unstakeSOL = async () => {
        if (!publicKey) {
            alert('Please connect to a Solana wallet!');
            return;
        }

        try {
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: STEWARD_PROGRAM_ID, // Steward Program ID
                    toPubkey: publicKey,
                    lamports: 1e9, // Example amount in lamports
                })
            );

            const { blockhash } = await solanaConnection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, solanaConnection);
            await solanaConnection.confirmTransaction(signature, 'processed');

            setSnackbar({ open: true, message: 'Unstaking SOL with Jito via Steward Program successful!', severity: 'success' });
            setSolStaked((prev) => prev - 1); // Update staked amount
            fetchJitoSolBalance(); // Fetch updated JitoSOL balance
        } catch (error) {
            console.error('Error unstaking SOL with Jito via Steward Program:', error);
            setSnackbar({ open: true, message: 'Error unstaking SOL with Jito via Steward Program. Please try again.', severity: 'error' });
        }
    };

    // Function to fetch JitoSOL balance
    const fetchJitoSolBalance = async () => {
        if (!publicKey) return;

        try {
            const balance = await solanaConnection.getTokenAccountsByOwner(publicKey, {
                programId: STEWARD_PROGRAM_ID,
            });

            // Assume JitoSOL is the token associated; adjust based on your program logic
            const jitoSolBalance = balance.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0;
            setJitoSolBalance(jitoSolBalance);
        } catch (error) {
            console.error('Error fetching JitoSOL balance:', error);
        }
    };

    // Snackbar handler
    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    return (
        <ConnectionProvider endpoint={SOLANA_CLUSTER_URL}>
            <WalletProvider wallets={[new PhantomWalletAdapter()]} autoConnect>
                <WalletModalProvider>
                    <Container maxWidth="lg">
                        <Typography variant="h4" align="center" gutterBottom>
                            Staking Dashboard
                        </Typography>
                        <Box display="flex" justifyContent="center" marginBottom={2}>
                            <WalletMultiButton />
                        </Box>
                        {loading ? (
                            <Box display="flex" justifyContent="center" marginTop={4}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Grid container spacing={4}>
                                {/* Ethereum Staking Card */}
                                <Grid item xs={12} md={6}>
                                    <Card sx={{ padding: 2, boxShadow: 3 }}>
                                        <CardContent>
                                            <Typography variant="h5" color="primary" gutterBottom>
                                                Ethereum Staking with Lido
                                            </Typography>
                                            <Typography variant="body1" gutterBottom>
                                                <Tooltip title="The total amount of ETH you've staked in Lido">
                                                    <span>Total ETH Staked: {ethStaked} ETH</span>
                                                </Tooltip>
                                            </Typography>
                                            <Typography variant="body1" gutterBottom>
                                                <Tooltip title="The current balance of your stETH, representing staked ETH in Lido">
                                                    <span>stETH Balance: {stEthBalance} stETH</span>
                                                </Tooltip>
                                            </Typography>
                                            <Box display="flex" justifyContent="space-between" marginTop={2}>
                                                <Button variant="contained" color="primary" onClick={stakeETH}>
                                                    Stake ETH
                                                </Button>
                                                <Button variant="outlined" color="secondary" onClick={unstakeETH}>
                                                    Unstake ETH
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                {/* Solana Staking Card */}
                                <Grid item xs={12} md={6}>
                                    <Card sx={{ padding: 2, boxShadow: 3 }}>
                                        <CardContent>
                                            <Typography variant="h5" color="primary" gutterBottom>
                                                Solana Staking with Jito via Steward Program
                                            </Typography>
                                            <Typography variant="body1" gutterBottom>
                                                <Tooltip title="The total amount of SOL you've staked with Jito">
                                                    <span>Total SOL Staked: {solStaked} SOL</span>
                                                </Tooltip>
                                            </Typography>
                                            <Typography variant="body1" gutterBottom>
                                                <Tooltip title="The current balance of your JitoSOL, representing staked SOL in the Jito program">
                                                    <span>JitoSOL Balance: {jitoSolBalance} JitoSOL</span>
                                                </Tooltip>
                                            </Typography>
                                            <Box display="flex" justifyContent="space-between" marginTop={2}>
                                                <Button variant="contained" color="primary" onClick={stakeSOL}>
                                                    Stake SOL
                                                </Button>
                                                <Button variant="outlined" color="secondary" onClick={unstakeSOL}>
                                                    Unstake SOL
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        )}
                        <Snackbar
                            open={snackbar.open}
                            autoHideDuration={6000}
                            onClose={handleCloseSnackbar}
                            message={snackbar.message}
                            severity={snackbar.severity}
                        />
                    </Container>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default StakingDashboard;
