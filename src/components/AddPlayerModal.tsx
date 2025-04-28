import React, { useState, useEffect } from 'react';
import { User, Hash, X, Loader2 } from 'lucide-react'; // Added Loader2 import

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated signature to reflect async nature (though we don't await here)
  onAddPlayer: (firstName: string, lastName: string, number: string) => Promise<void>;
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ isOpen, onClose, onAddPlayer }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState('');
  const [isAdding, setIsAdding] = useState(false); // Loading state

  useEffect(() => {
    if (isOpen) {
      setFirstName('');
      setLastName('');
      setNumber('');
      setIsAdding(false); // Reset loading state
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim() || lastName.trim()) {
      setIsAdding(true); // Start loading
      try {
        // Call the async function from context
        await onAddPlayer(firstName.trim(), lastName.trim(), number.trim());
        onClose(); // Close modal only on success
      } catch (error) {
        // Error handling is done in the context, but we stop loading here
        console.error("Add player failed in modal:", error);
        // Keep modal open if add fails? Or rely on context alert?
      } finally {
        setIsAdding(false); // Stop loading regardless of outcome
      }
    } else {
      alert("Please enter at least a first or last name.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Player</h2>
          <button onClick={onClose} disabled={isAdding} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input fields (unchanged structure) */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-gray-400" /></span>
              <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., John" disabled={isAdding} />
            </div>
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-gray-400" /></span>
              <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., Doe" disabled={isAdding} />
            </div>
          </div>
          <div>
            <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">Number (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Hash size={18} className="text-gray-400" /></span>
              <input type="text" id="number" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., 10" disabled={isAdding} />
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} disabled={isAdding} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition disabled:opacity-50"> Cancel </button>
            <button type="submit" disabled={isAdding} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center min-w-[110px]">
              {isAdding ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : null}
              {isAdding ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPlayerModal;
