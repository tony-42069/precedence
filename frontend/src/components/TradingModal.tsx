import { useState } from 'react';
import { useTrading } from '../hooks/useTrading';
import { useWallet } from '../hooks/useWallet';

interface TradingModalProps {
  market: any;
  isOpen: boolean;
  onClose: () => void;
}

export const TradingModal = ({ market, isOpen, onClose }: TradingModalProps) => {
  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');
  const { placeTrade, loading, error } = useTrading();
  const { walletState } = useWallet();

  if (!isOpen) return null;

  const handleTrade = async () => {
    if (!walletState.connected) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      const result = await placeTrade(
        {
          marketId: market.condition_id,
          tokenId: market.clobTokenIds?.[0] || market.tokens?.[0]?.token_id,
          side,
          amount: parseFloat(amount),
          price: side === 'YES' ? 0.5 : 0.5, // TODO: Get real price
        },
        walletState.address!
      );

      alert(`Trade successful! Order ID: ${result.orderId}`);
      onClose();
    } catch (err) {
      console.error('Trade failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{market.question}</h2>

        {/* YES/NO Toggle */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setSide('YES')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium ${
              side === 'YES'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            YES
          </button>
          <button
            onClick={() => setSide('NO')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium ${
              side === 'NO'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            NO
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="10.00"
            min="1"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleTrade}
            disabled={loading || !amount}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Placing...' : 'Place Trade'}
          </button>
        </div>
      </div>
    </div>
  );
};
