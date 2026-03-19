import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}