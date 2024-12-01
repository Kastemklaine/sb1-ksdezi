import React from 'react';
import { useUserStore } from '../../store/useUserStore';
import { Button } from '../ui/Button';

export const Header = () => {
  const { currentUser } = useUserStore();

  return (
    <header className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-bold text-purple-400">SingrdBeats</h1>
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{currentUser.name}</span>
              {!currentUser.isPremium && (
                <Button variant="premium">Upgrade to Premium</Button>
              )}
            </div>
          ) : (
            <Button>Sign In</Button>
          )}
        </div>
      </div>
    </header>
  );
};