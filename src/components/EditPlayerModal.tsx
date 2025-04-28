import React, { useState, useEffect } from 'react';
import { User, Hash, X, Trash2, Loader2 } from 'lucide-react'; // Added Loader2
import { Player, PlayerData } from '../context/TeamContext'; // Import PlayerData
import ConfirmModal from './ConfirmModal';

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null; // Still receives the local Player type with location/position
  // Updated signatures for async operations and PlayerData fields
  onUpdatePlayer: (id: string, updates: Partial<Pick<PlayerData, 'first_name' | 'last_name' | 'number'>>) => Promise<void>;
  onDeletePlayer: (id: string) => Promise<void>;
}

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ isOpen, onClose, player, onUpdatePlayer, onDeletePlayer }) => {
  // State uses PlayerData fields for editing
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState(''); // Keep as string for input field
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (isOpen && player) {
      // Populate state from the passed player prop using correct field names
      setFirstName(player.first_name);
      setLastName(player.last_name);
      setNumber(player.number ?? ''); // Handle null number from DB
      setIsUpdating(false);
      setIsDeleting(false);
    } else if (!isOpen) {
        setFirstName('');
        setLastName('');
        setNumber('');
        setIsConfirmDeleteOpen(false);
        setIsUpdating(false);
        setIsDeleting(false);
    }
  }, [isOpen, player]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (player && (firstName.trim() || lastName.trim())) {
      setIsUpdating(true);
      try {
        // Pass correct field names for update
        await onUpdatePlayer(player.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          number: number.trim(), // Context handler will convert '' to null
        });
        // onClose(); // Context handler closes modal now
      } catch (error) {
        console.error("Update player failed in modal:", error);
      } finally {
        setIsUpdating(false);
      }
    } else {
      alert("Please enter at least a first or last name.");
    }
  };

  const handleDeleteClick = () => { setIsConfirmDeleteOpen(true); };

  const handleConfirmDelete = async () => {
    if (player) {
      setIsDeleting(true); // Indicate deletion in progress
      setIsConfirmDeleteOpen(false); // Close confirm modal immediately
      try {
        await onDeletePlayer(player.id);
        // onClose(); // Context handler closes modal now
      } catch (error) {
        console.error("Delete player failed in modal:", error);
      } finally {
         setIsDeleting(false); // Stop indicating deletion
         // onClose(); // Ensure modal closes even if delete fails in context? Or rely on context?
      }
    }
  };

  if (!isOpen || !player) return null;
  const isLoading = isUpdating || isDeleting;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Edit Player</h2>
            <button onClick={onClose} disabled={isLoading} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input fields */}
            <div>
              <label htmlFor="editFirstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-gray-400" /></span>
                <input type="text" id="editFirstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., John" disabled={isLoading} />
              </div>
            </div>
            <div>
              <label htmlFor="editLastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-gray-400" /></span>
                <input type="text" id="editLastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., Doe" disabled={isLoading} />
              </div>
            </div>
            <div>
              <label htmlFor="editNumber" className="block text-sm font-medium text-gray-700 mb-1">Number (Optional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Hash size={18} className="text-gray-400" /></span>
                <input type="text" id="editNumber" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., 10" disabled={isLoading} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              <button type="button" onClick={handleDeleteClick} disabled={isLoading} className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition flex items-center space-x-1 disabled:opacity-50">
                {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
              <div className="flex space-x-3">
                <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center min-w-[130px]">
                   {isUpdating ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                   {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Player"
        // Use correct field names for display
        message={`Are you sure you want to delete ${player.first_name} ${player.last_name}? This action cannot be undone.`}
        confirmText="Delete Player"
      />
    </>
  );
};

export default EditPlayerModal;
